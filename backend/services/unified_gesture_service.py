"""
Unified Gesture Recognition Service
====================================
Integrates both static (letters) and dynamic (words) ASL gesture recognition models.

- Static Model: LSTM classifier for ASL letters (A-Y)
- Dynamic Model: LSTM encoder for ASL words with embedding-based similarity

Both models:
  - Input: 60-frame sequences of hand landmarks (126 values per frame)
  - Use MediaPipe for landmark extraction
  - Normalize landmarks for position/scale invariance
"""

from __future__ import annotations

from base64 import b64decode
from io import BytesIO
from pathlib import Path
from typing import Any, Optional
import threading
import time
import urllib.request

import mediapipe as mp
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from logging_config import get_logger
from services.gesture_recognition import GestureRecognitionService as LegacyWordGestureService

# ── Constants ──────────────────────────────────────────────────
MODEL_DIR = Path(__file__).resolve().parents[2] / "model"
STATIC_MODEL_PATH = MODEL_DIR / "static" / "static_model.pt"
DYNAMIC_MODEL_PATH = MODEL_DIR / "dynamic" / "dynamic_model.pth"
REFERENCE_EMBEDDINGS_PATH = MODEL_DIR / "dynamic" / "reference_embeddings.npz"
GESTURE_TASK_PATH = MODEL_DIR / "static" / "gesture_recognizer.task"
GESTURE_TASK_URL = (
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/"
    "gesture_recognizer/float16/1/gesture_recognizer.task"
)

SEQUENCE_LENGTH = 60
FRAME_SIZE = 126  # 21 landmarks × 3 coords × 2 hands
WRIST_IDX = 0
MIDDLE_MCP_IDX = 9
VALUES_PER_HAND = 63
EPS = 1e-6

# Static model (letters) label map
LETTER_LABELS = {
    0: "NOTHING",
    1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G", 8: "H", 9: "I",
    10: "K", 11: "L", 12: "M", 13: "N", 14: "O", 15: "P", 16: "Q", 17: "R",
    18: "S", 19: "T", 20: "U", 21: "V", 22: "W", 23: "X", 24: "Y"
}

# ── MediaPipe lazy-loaded on demand ────────────────────────────
_MP_GESTURE_RECOGNIZER = None
logger = get_logger("handspeak.services.unified")


def _ensure_gesture_task_model() -> bool:
    """Ensure the MediaPipe gesture task file is present locally."""
    if GESTURE_TASK_PATH.exists():
        return True

    try:
        GESTURE_TASK_PATH.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(GESTURE_TASK_URL, str(GESTURE_TASK_PATH))
        return True
    except Exception as error:
        logger.warning("static_task_download_failed error=%s", error)
        return False


def _get_gesture_recognizer():
    """Create and cache a single GestureRecognizer instance (Tasks API)."""
    global _MP_GESTURE_RECOGNIZER
    if _MP_GESTURE_RECOGNIZER is not None:
        return _MP_GESTURE_RECOGNIZER

    if not _ensure_gesture_task_model():
        return None

    try:
        BaseOptions = mp.tasks.BaseOptions
        GestureRecognizer = mp.tasks.vision.GestureRecognizer
        GestureRecognizerOptions = mp.tasks.vision.GestureRecognizerOptions
        RunningMode = mp.tasks.vision.RunningMode

        options = GestureRecognizerOptions(
            base_options=BaseOptions(model_asset_path=str(GESTURE_TASK_PATH)),
            running_mode=RunningMode.IMAGE,
            num_hands=2,
        )
        _MP_GESTURE_RECOGNIZER = GestureRecognizer.create_from_options(options)
        return _MP_GESTURE_RECOGNIZER
    except Exception as error:
        logger.warning("static_mediapipe_init_failed error=%s", error)
        return None


# ── Model Architectures ────────────────────────────────────────

class StaticLSTMClassifier(nn.Module):
    """LSTM-based classifier for ASL letters."""
    def __init__(self, input_size: int = 126, hidden_size: int = 128, num_classes: int = 25):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        _, (hidden, _) = self.lstm(x)
        return self.fc(hidden[-1])


class DynamicLSTMEncoder(nn.Module):
    """LSTM-based encoder for ASL words that produces embeddings."""
    def __init__(self, input_size: int = 126, hidden_size: int = 128, embedding_dim: int = 256):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden_size * 2, embedding_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, (hidden, _) = self.lstm(x)
        # Take last hidden state and pass through FC
        last_state = hidden[-1]  # [batch, hidden_size * 2]
        embedding = self.fc(last_state)
        # L2 normalize
        return torch.nn.functional.normalize(embedding, p=2, dim=1)


# ── Helper Functions ──────────────────────────────────────────

def normalize_frame_landmarks(frame_landmarks: np.ndarray) -> np.ndarray:
    """
    Normalize hand landmarks for translation and scale invariance.
    Center at wrist (landmark 0), scale by wrist-to-middle-MCP distance.
    
    Input: 126-dim array (hand0: 0-62, hand1: 63-125)
    Output: 126-dim float32 normalized array
    """
    arr = np.asarray(frame_landmarks, dtype=np.float32)
    if arr.size != FRAME_SIZE:
        raise ValueError(f"Expected {FRAME_SIZE} values, got {arr.size}")

    out = np.empty(FRAME_SIZE, dtype=np.float32)

    for hand_start in (0, VALUES_PER_HAND):
        hand = arr[hand_start : hand_start + VALUES_PER_HAND]
        if np.all(hand == 0):
            out[hand_start : hand_start + VALUES_PER_HAND] = hand
            continue

        points = hand.reshape(21, 3)
        center = points[WRIST_IDX].copy()
        points_centered = points - center
        scale = np.linalg.norm(points_centered[MIDDLE_MCP_IDX])
        if scale < EPS:
            scale = 1.0
        points_normalized = points_centered / scale
        out[hand_start : hand_start + VALUES_PER_HAND] = points_normalized.ravel()

    return out


def extract_landmarks_from_image(image_data: str) -> Optional[np.ndarray]:
    """
    Extract hand landmarks from a base64 encoded image.
    Returns 126-dim array (21 landmarks × 3 coords × 2 hands) or None if extraction fails.
    
    Note: If MediaPipe is unavailable or no hand is detected, returns zero array.
    """
    try:
        # Decode base64 image
        payload = image_data.split(",", 1)[1] if "," in image_data else image_data
        raw = b64decode(payload)
        image = Image.open(BytesIO(raw)).convert("RGB")
        frame = np.array(image)
        
        landmarks = np.zeros(FRAME_SIZE, dtype=np.float32)
        
        try:
            recognizer = _get_gesture_recognizer()
            if recognizer is None:
                return landmarks

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
            # IMAGE mode API for GestureRecognizer
            result = recognizer.recognize(mp_image)

            if result and result.hand_landmarks:
                for hand_idx, hand_landmarks in enumerate(result.hand_landmarks[:2]):
                    start_idx = hand_idx * VALUES_PER_HAND
                    for lm_idx, lm in enumerate(hand_landmarks):
                        landmarks[start_idx + lm_idx * 3] = lm.x
                        landmarks[start_idx + lm_idx * 3 + 1] = lm.y
                        landmarks[start_idx + lm_idx * 3 + 2] = lm.z
        except Exception as error:
            logger.warning("static_landmark_extraction_unavailable error_type=%s", type(error).__name__)
        
        return landmarks
    except Exception as error:
        logger.warning("static_frame_decode_error error=%s", error)
        return None


# ── Main Service ──────────────────────────────────────────────

class UnifiedGestureService:
    """Unified service for letter and word ASL gesture recognition."""
    
    def __init__(self):
        self.device = torch.device("cpu")
        logger.info("unified_service_init_start")
        
        # Load static model (letters)
        self.static_model = None
        self.static_available = False
        try:
            if STATIC_MODEL_PATH.exists():
                logger.info("static_model_loading path=%s", STATIC_MODEL_PATH)
                self.static_model = StaticLSTMClassifier()
                checkpoint = torch.load(STATIC_MODEL_PATH, map_location=self.device)
                self.static_model.load_state_dict(checkpoint)
                self.static_model.eval()
                self.static_available = True
                logger.info("static_model_loaded")
            else:
                logger.warning("static_model_missing path=%s", STATIC_MODEL_PATH)
        except Exception as e:
            logger.exception("static_model_load_failed")
        
        # Load dynamic model (words) via checkpoint-compatible legacy service.
        self.dynamic_available = False
        self.word_service = None
        try:
            self.word_service = LegacyWordGestureService()
            self.dynamic_available = True
            logger.info("dynamic_model_loaded")
        except Exception as e:
            logger.exception("dynamic_model_load_failed")
        
        if not (self.static_available or self.dynamic_available):
            logger.error(
                "no_models_loaded static_path=%s dynamic_path=%s reference_path=%s",
                STATIC_MODEL_PATH,
                DYNAMIC_MODEL_PATH,
                REFERENCE_EMBEDDINGS_PATH,
            )
        
        logger.info(
            "unified_service_init_done static_available=%s dynamic_available=%s",
            self.static_available,
            self.dynamic_available,
        )
    
    def build_sequence(self, frame_data: list[str]) -> Optional[torch.Tensor]:
        """
        Build a sequence of normalized landmarks from base64 frame data.
        Returns tensor of shape [1, sequence_length, 126] or None if insufficient frames.
        """
        landmarks_sequence = []
        
        for frame_data_item in frame_data:
            landmarks = extract_landmarks_from_image(frame_data_item)
            if landmarks is not None:
                normalized = normalize_frame_landmarks(landmarks)
                landmarks_sequence.append(normalized)
        
        if not landmarks_sequence:
            return None
        
        # Pad or truncate to SEQUENCE_LENGTH
        if len(landmarks_sequence) < SEQUENCE_LENGTH:
            # Pad with last frame
            last_frame = landmarks_sequence[-1]
            while len(landmarks_sequence) < SEQUENCE_LENGTH:
                landmarks_sequence.append(last_frame.copy())
        else:
            landmarks_sequence = landmarks_sequence[:SEQUENCE_LENGTH]
        
        sequence = np.stack(landmarks_sequence, axis=0)  # [60, 126]
        tensor = torch.from_numpy(sequence).float().unsqueeze(0)  # [1, 60, 126]
        return tensor
    
    def recognize_letter(self, frame_data: list[str], threshold: float = 0.6) -> dict[str, Any]:
        """
        Recognize an ASL letter using the static model.
        """
        if not self.static_available:
            raise RuntimeError("Static model not available")
        
        sequence = self.build_sequence(frame_data)
        if sequence is None:
            raise ValueError("Failed to extract landmarks from frames")
        
        with torch.no_grad():
            output = self.static_model(sequence.to(self.device))
            probabilities = torch.softmax(output, dim=1)[0]
            confidence, predicted_idx = torch.max(probabilities, 0)
        
        predicted_idx = predicted_idx.item()
        confidence = float(confidence.item())
        predicted_letter = LETTER_LABELS.get(predicted_idx, "UNKNOWN")
        
        # Get top-5 predictions
        top_probs, top_indices = torch.topk(probabilities, min(5, len(probabilities)))
        top_matches = [
            {"label": LETTER_LABELS.get(idx.item(), "UNKNOWN"), "confidence": float(prob.item())}
            for prob, idx in zip(top_probs, top_indices)
        ]
        
        is_match = confidence >= threshold
        
        return {
            "predicted": predicted_letter,
            "confidence": confidence,
            "threshold": threshold,
            "is_match": is_match,
            "top_matches": top_matches,
            "message": f"Recognized: {predicted_letter} ({confidence*100:.1f}%)"
        }
    
    def recognize_word(self, frame_data: list[str], target_word: Optional[str] = None, 
                      threshold: float = 0.72) -> dict[str, Any]:
        """
        Recognize an ASL word using the dynamic model with similarity matching.
        """
        if not self.dynamic_available:
            raise RuntimeError("Dynamic model not available")
        if self.word_service is None:
            raise RuntimeError("Dynamic word service not initialized")
        if not frame_data:
            raise ValueError("At least one frame is required")

        normalized_target = target_word.strip().upper() if target_word else ""
        result = self.word_service.verify(
            target_word=normalized_target,
            frame_data=frame_data,
            top_k=5,
            threshold=threshold,
        )

        return {
            "predicted": result["best_match"],
            "similarity": result["similarity"],
            "target_word": result["target_word"],
            "target_similarity": result["target_similarity"],
            "threshold": result["threshold"],
            "is_match": result["is_match"],
            "top_matches": result["top_matches"],
            "message": result.get("message", ""),
        }
    
    def verify(self, target_label: str, frame_data: list[str], 
              model_type: str = "auto", top_k: int = 5, threshold: float = 0.72) -> dict[str, Any]:
        """
        Universal verification method that auto-detects model type based on target label.
        
        Args:
            target_label: The target gesture (letter or word) to match
            frame_data: List of base64 encoded frame images
            model_type: "auto", "static", or "dynamic"
            top_k: Number of top matches to return
            threshold: Confidence/similarity threshold for match
        
        Returns:
            Verification result dictionary
        """
        target_normalized = target_label.strip().upper()
        
        # Auto-detect model type
        if model_type == "auto":
            # If target is a single letter, use static model
            if len(target_normalized) == 1 and target_normalized in LETTER_LABELS.values():
                model_type = "static"
            else:
                model_type = "dynamic"
        
        try:
            if model_type == "static":
                result = self.recognize_letter(frame_data, threshold=threshold)
                result["target_label"] = target_normalized
                result["is_match"] = result["predicted"] == target_normalized
                return result
            else:  # dynamic
                result = self.recognize_word(frame_data, target_word=target_normalized, threshold=threshold)
                result["target_label"] = target_normalized
                return result
        except RuntimeError as e:
            raise RuntimeError(f"Model not available: {e}")
        except ValueError as e:
            raise ValueError(f"Invalid input: {e}")


# ── Global Service Instance ────────────────────────────────────

_SERVICE: UnifiedGestureService | None = None
_SERVICE_INITIALIZING = False
_SERVICE_ERROR: str | None = None
_SERVICE_LOCK = threading.Lock()


def _warmup_worker() -> None:
    global _SERVICE, _SERVICE_INITIALIZING, _SERVICE_ERROR

    built_service: UnifiedGestureService | None = None
    build_error: str | None = None

    try:
        logger.info("gesture_warmup_worker_start")
        built_service = UnifiedGestureService()
    except Exception as error:
        build_error = str(error)
        logger.exception("gesture_warmup_worker_failed")

    with _SERVICE_LOCK:
        _SERVICE = built_service
        _SERVICE_ERROR = build_error
        _SERVICE_INITIALIZING = False
        logger.info("gesture_warmup_worker_done ready=%s error=%s", built_service is not None, build_error)


def start_gesture_service_warmup(force_reset: bool = False) -> bool:
    """
    Start background model warmup. Returns True if a new warmup was started.
    """
    global _SERVICE, _SERVICE_INITIALIZING, _SERVICE_ERROR

    with _SERVICE_LOCK:
        if force_reset:
            _SERVICE = None
            _SERVICE_ERROR = None

        if _SERVICE is not None or _SERVICE_INITIALIZING:
            return False

        _SERVICE_INITIALIZING = True
        _SERVICE_ERROR = None

        thread = threading.Thread(target=_warmup_worker, daemon=True, name="gesture-service-warmup")
        thread.start()
        logger.info("gesture_warmup_thread_started")
        return True


def get_gesture_service(wait: bool = True, timeout_seconds: float = 0.0) -> UnifiedGestureService:
    """
    Get the unified gesture service singleton.

    If wait=False and service is still loading, raises RuntimeError immediately.
    If wait=True, waits until service is ready or timeout is hit.
    """
    global _SERVICE, _SERVICE_ERROR

    if _SERVICE is not None:
        return _SERVICE

    start_gesture_service_warmup()

    if not wait:
        logger.info("gesture_service_not_ready_non_blocking")
        raise RuntimeError("Gesture service is still initializing")

    deadline = None if timeout_seconds <= 0 else (time.monotonic() + timeout_seconds)
    while True:
        if _SERVICE is not None:
            return _SERVICE

        if _SERVICE_ERROR:
            logger.error("gesture_service_error error=%s", _SERVICE_ERROR)
            raise RuntimeError(_SERVICE_ERROR)

        if deadline is not None and time.monotonic() >= deadline:
            raise RuntimeError("Gesture service is still initializing")

        time.sleep(0.05)


def get_gesture_service_status() -> dict[str, Any]:
    """Expose current service readiness for API status checks."""
    with _SERVICE_LOCK:
        service = _SERVICE
        return {
            "initializing": _SERVICE_INITIALIZING,
            "ready": service is not None,
            "error": _SERVICE_ERROR,
            "static_available": bool(service and service.static_available),
            "dynamic_available": bool(service and service.dynamic_available),
        }


def reset_gesture_service() -> None:
    """Reset singleton so it can be re-initialized on next access."""
    global _SERVICE, _SERVICE_ERROR, _SERVICE_INITIALIZING
    with _SERVICE_LOCK:
        _SERVICE = None
        _SERVICE_ERROR = None
        _SERVICE_INITIALIZING = False

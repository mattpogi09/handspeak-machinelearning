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


logger = get_logger("handspeak.services.static")

MODEL_DIR = Path(__file__).resolve().parents[2] / "model"
STATIC_MODEL_PATH = MODEL_DIR / "static" / "static_model.pt"
GESTURE_TASK_PATH = MODEL_DIR / "static" / "gesture_recognizer.task"
GESTURE_TASK_URL = (
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/"
    "gesture_recognizer/float16/1/gesture_recognizer.task"
)

SEQUENCE_LENGTH = 30
FRAME_SIZE = 126  # 21 landmarks * 3 coords * 2 hands
VALUES_PER_HAND = 63
WRIST_IDX = 0
MIDDLE_MCP_IDX = 9
EPS = 1e-6

LETTER_LABELS = {
    0: "NOTHING",
    1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G", 8: "H", 9: "I",
    10: "K", 11: "L", 12: "M", 13: "N", 14: "O", 15: "P", 16: "Q", 17: "R",
    18: "S", 19: "T", 20: "U", 21: "V", 22: "W", 23: "X", 24: "Y",
}
LABEL_TO_INDEX = {label: idx for idx, label in LETTER_LABELS.items()}

_MP_GESTURE_RECOGNIZER = None


class StaticLSTMClassifier(nn.Module):
    def __init__(self, input_size: int = 126, hidden_size: int = 128, num_classes: int = 25):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        _, (hidden, _) = self.lstm(x)
        return self.fc(hidden[-1])


def _ensure_gesture_task_model() -> bool:
    if GESTURE_TASK_PATH.exists():
        return True

    try:
        GESTURE_TASK_PATH.parent.mkdir(parents=True, exist_ok=True)
        logger.info("static_task_downloading path=%s", GESTURE_TASK_PATH)
        urllib.request.urlretrieve(GESTURE_TASK_URL, str(GESTURE_TASK_PATH))
        logger.info("static_task_downloaded path=%s", GESTURE_TASK_PATH)
        return True
    except Exception as error:
        logger.warning("static_task_download_failed error=%s", error)
        return False


def _get_gesture_recognizer():
    global _MP_GESTURE_RECOGNIZER
    if _MP_GESTURE_RECOGNIZER is not None:
        return _MP_GESTURE_RECOGNIZER

    if not _ensure_gesture_task_model():
        return None

    try:
        options = mp.tasks.vision.GestureRecognizerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(GESTURE_TASK_PATH)),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_hands=2,
        )
        _MP_GESTURE_RECOGNIZER = mp.tasks.vision.GestureRecognizer.create_from_options(options)
        logger.info("static_mediapipe_ready")
        return _MP_GESTURE_RECOGNIZER
    except Exception as error:
        logger.warning("static_mediapipe_init_failed error=%s", error)
        return None


def normalize_frame_landmarks(frame_landmarks: np.ndarray) -> np.ndarray:
    arr = np.asarray(frame_landmarks, dtype=np.float32)
    if arr.size != FRAME_SIZE:
        raise ValueError(f"Expected {FRAME_SIZE} values, got {arr.size}")

    out = np.empty(FRAME_SIZE, dtype=np.float32)

    for hand_start in (0, VALUES_PER_HAND):
        hand = arr[hand_start: hand_start + VALUES_PER_HAND]
        if np.all(hand == 0):
            out[hand_start: hand_start + VALUES_PER_HAND] = hand
            continue

        points = hand.reshape(21, 3)
        center = points[WRIST_IDX].copy()
        points_centered = points - center
        scale = np.linalg.norm(points_centered[MIDDLE_MCP_IDX])
        if scale < EPS:
            scale = 1.0
        points_normalized = points_centered / scale
        out[hand_start: hand_start + VALUES_PER_HAND] = points_normalized.ravel()

    return out


def extract_landmarks_from_image(image_data: str) -> Optional[np.ndarray]:
    try:
        payload = image_data.split(",", 1)[1] if "," in image_data else image_data
        raw = b64decode(payload)
        image = Image.open(BytesIO(raw)).convert("RGB")
        frame = np.array(image)

        recognizer = _get_gesture_recognizer()
        landmarks = np.zeros(FRAME_SIZE, dtype=np.float32)
        if recognizer is None:
            return landmarks

        result = recognizer.recognize(mp.Image(image_format=mp.ImageFormat.SRGB, data=frame))
        if result and result.hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(result.hand_landmarks[:2]):
                start_idx = hand_idx * VALUES_PER_HAND
                for lm_idx, lm in enumerate(hand_landmarks):
                    landmarks[start_idx + lm_idx * 3] = lm.x
                    landmarks[start_idx + lm_idx * 3 + 1] = lm.y
                    landmarks[start_idx + lm_idx * 3 + 2] = lm.z

        return landmarks
    except Exception as error:
        logger.warning("static_landmark_extract_failed error=%s", error)
        return None


class StaticGestureService:
    def __init__(self) -> None:
        self.device = torch.device("cpu")
        self.model: StaticLSTMClassifier | None = None
        self.available = False

        logger.info("static_service_init_start")
        self._load_model()
        logger.info("static_service_init_done available=%s", self.available)

    def _load_model(self) -> None:
        if not STATIC_MODEL_PATH.exists():
            raise FileNotFoundError(f"Static checkpoint not found: {STATIC_MODEL_PATH}")

        logger.info("static_model_loading path=%s", STATIC_MODEL_PATH)
        checkpoint = torch.load(STATIC_MODEL_PATH, map_location=self.device)
        state_dict = checkpoint.get("model_state") if isinstance(checkpoint, dict) and "model_state" in checkpoint else checkpoint

        model = StaticLSTMClassifier()
        try:
            model.load_state_dict(state_dict, strict=True)
        except Exception:
            # Fallback for older checkpoints with slight key differences.
            model.load_state_dict(state_dict, strict=False)
            logger.warning("static_model_loaded_with_non_strict_state")

        model.eval()
        self.model = model
        self.available = True
        logger.info("static_model_loaded")

    def build_sequence(self, frame_data: list[str]) -> Optional[torch.Tensor]:
        landmarks_sequence: list[np.ndarray] = []

        for frame_data_item in frame_data:
            landmarks = extract_landmarks_from_image(frame_data_item)
            if landmarks is not None:
                landmarks_sequence.append(normalize_frame_landmarks(landmarks))

        if not landmarks_sequence:
            return None

        if len(landmarks_sequence) < SEQUENCE_LENGTH:
            last_frame = landmarks_sequence[-1]
            while len(landmarks_sequence) < SEQUENCE_LENGTH:
                landmarks_sequence.append(last_frame.copy())
        else:
            landmarks_sequence = landmarks_sequence[:SEQUENCE_LENGTH]

        sequence = np.stack(landmarks_sequence, axis=0)
        return torch.from_numpy(sequence).float().unsqueeze(0)

    def verify(self, target_label: str, frame_data: list[str], threshold: float = 0.66, top_k: int = 5) -> dict[str, Any]:
        if not self.available or self.model is None:
            raise RuntimeError("Static model not available")

        target_normalized = target_label.strip().upper()
        if target_normalized not in LABEL_TO_INDEX:
            raise KeyError(target_label)

        if not frame_data:
            raise ValueError("At least one frame is required")

        sequence = self.build_sequence(frame_data)
        if sequence is None:
            raise ValueError("Failed to extract landmarks from frames")

        with torch.no_grad():
            logits = self.model(sequence.to(self.device))[0]
            probs = torch.softmax(logits, dim=0)

        top_k = max(1, min(int(top_k), len(probs)))
        top_probs, top_idx = torch.topk(probs, top_k)

        best_idx = int(top_idx[0].item())
        best_label = LETTER_LABELS.get(best_idx, "UNKNOWN")
        best_confidence = float(top_probs[0].item())

        target_idx = LABEL_TO_INDEX[target_normalized]
        target_confidence = float(probs[target_idx].item())
        is_match = best_label == target_normalized and target_confidence >= threshold

        top_matches = [
            {"label": LETTER_LABELS.get(int(idx.item()), "UNKNOWN"), "confidence": float(prob.item())}
            for prob, idx in zip(top_probs, top_idx)
        ]

        logger.info(
            "static_verify_result target=%s best=%s target_conf=%.4f best_conf=%.4f match=%s",
            target_normalized,
            best_label,
            target_confidence,
            best_confidence,
            is_match,
        )

        return {
            "target_label": target_normalized,
            "predicted": best_label,
            "confidence": best_confidence,
            "target_similarity": target_confidence,
            "threshold": threshold,
            "is_match": is_match,
            "top_matches": top_matches,
            "message": "Match confirmed" if is_match else f"Keep trying ({best_label})",
        }


_STATIC_SERVICE: StaticGestureService | None = None
_STATIC_INITIALIZING = False
_STATIC_ERROR: str | None = None
_STATIC_LOCK = threading.Lock()


def _static_warmup_worker() -> None:
    global _STATIC_SERVICE, _STATIC_INITIALIZING, _STATIC_ERROR

    built_service: StaticGestureService | None = None
    build_error: str | None = None

    try:
        logger.info("static_warmup_worker_start")
        built_service = StaticGestureService()
    except Exception as error:
        build_error = str(error)
        logger.exception("static_warmup_worker_failed")

    with _STATIC_LOCK:
        _STATIC_SERVICE = built_service
        _STATIC_ERROR = build_error
        _STATIC_INITIALIZING = False
        logger.info("static_warmup_worker_done ready=%s error=%s", built_service is not None, build_error)


def start_static_service_warmup(force_reset: bool = False) -> bool:
    global _STATIC_SERVICE, _STATIC_INITIALIZING, _STATIC_ERROR

    with _STATIC_LOCK:
        if force_reset:
            _STATIC_SERVICE = None
            _STATIC_ERROR = None

        if _STATIC_SERVICE is not None or _STATIC_INITIALIZING:
            return False

        _STATIC_INITIALIZING = True
        _STATIC_ERROR = None

        thread = threading.Thread(target=_static_warmup_worker, daemon=True, name="static-service-warmup")
        thread.start()
        logger.info("static_warmup_thread_started")
        return True


def get_static_service(wait: bool = True, timeout_seconds: float = 0.0) -> StaticGestureService:
    global _STATIC_SERVICE, _STATIC_ERROR

    if _STATIC_SERVICE is not None:
        return _STATIC_SERVICE

    start_static_service_warmup()

    if not wait:
        raise RuntimeError("Static gesture service is still initializing")

    deadline = None if timeout_seconds <= 0 else (time.monotonic() + timeout_seconds)
    while True:
        if _STATIC_SERVICE is not None:
            return _STATIC_SERVICE

        if _STATIC_ERROR:
            raise RuntimeError(_STATIC_ERROR)

        if deadline is not None and time.monotonic() >= deadline:
            raise RuntimeError("Static gesture service is still initializing")

        time.sleep(0.05)


def get_static_service_status() -> dict[str, Any]:
    with _STATIC_LOCK:
        service = _STATIC_SERVICE
        return {
            "initializing": _STATIC_INITIALIZING,
            "ready": service is not None,
            "error": _STATIC_ERROR,
            "available": bool(service and service.available),
        }


def reset_static_service() -> None:
    global _STATIC_SERVICE, _STATIC_INITIALIZING, _STATIC_ERROR
    with _STATIC_LOCK:
        _STATIC_SERVICE = None
        _STATIC_INITIALIZING = False
        _STATIC_ERROR = None

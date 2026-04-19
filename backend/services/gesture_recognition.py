from __future__ import annotations

from base64 import b64decode
from io import BytesIO
from pathlib import Path
from typing import Any
import threading
import time
import urllib.request

import mediapipe as mp
import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F

from logging_config import get_logger


MODEL_DIR = Path(__file__).resolve().parents[2] / "model"
DYNAMIC_DIR = MODEL_DIR / "dynamic"
CHECKPOINT_PATH = DYNAMIC_DIR / "my_model.pt"
HOLISTIC_TASK_PATH = DYNAMIC_DIR / "holistic_landmarker.task"
HOLISTIC_TASK_URL = (
    "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/"
    "holistic_landmarker/float16/latest/holistic_landmarker.task"
)

SEQUENCE_LENGTH = 30
FEATURE_DIM = 1629
NUM_SAMPLED_FRAMES = 30

FACE_LM = 468
POSE_LM = 33
HAND_LM = 21

FACE_DIM = FACE_LM * 3
POSE_DIM = POSE_LM * 3
HAND_DIM = HAND_LM * 3

POSE_END = FACE_DIM + POSE_DIM
LH_END = POSE_END + HAND_DIM
RH_END = LH_END + HAND_DIM

EPS = 1e-6
WRIST_IDX = 0
MIDDLE_MCP_IDX = 9

logger = get_logger("handspeak.services.dynamic")


class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 512):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float32).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2, dtype=torch.float32) * (-np.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, : x.size(1)]


class ASLFeatureExtractor(nn.Module):
    """Runtime architecture matching the new dynamic model checkpoint."""

    def __init__(
        self,
        input_dim: int,
        num_classes: int,
        d_model: int,
        n_heads: int,
        n_layers: int,
        d_ff: int,
        dropout: float,
        embedding_dim: int,
    ):
        super().__init__()
        self.input_proj = nn.Sequential(
            nn.Linear(input_dim, d_model),
            nn.LayerNorm(d_model),
        )
        self.pos_enc = PositionalEncoding(d_model)
        enc_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(enc_layer, num_layers=n_layers, norm=nn.LayerNorm(d_model))
        self.embedding_head = nn.Sequential(
            nn.Linear(d_model, embedding_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.LayerNorm(embedding_dim),
        )
        self.classifier = nn.Linear(embedding_dim, num_classes)

    def forward_features(self, x: torch.Tensor) -> torch.Tensor:
        x = self.input_proj(x)
        x = self.pos_enc(x)
        x = self.encoder(x)
        x = x.mean(dim=1)
        emb = self.embedding_head(x)
        return emb

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        emb = self.forward_features(x)
        return self.classifier(emb)


class GestureRecognitionService:
    def __init__(self) -> None:
        self.device = torch.device("cpu")
        logger.info("dynamic_service_init_start device=%s", self.device)
        self._init_holistic()
        self._load_model()
        logger.info("dynamic_service_init_done actions=%s", len(getattr(self, "actions", [])))

    def _init_holistic(self) -> None:
        self.holistic = None
        try:
            if not HOLISTIC_TASK_PATH.exists():
                HOLISTIC_TASK_PATH.parent.mkdir(parents=True, exist_ok=True)
                logger.info("dynamic_holistic_task_downloading path=%s", HOLISTIC_TASK_PATH)
                urllib.request.urlretrieve(HOLISTIC_TASK_URL, str(HOLISTIC_TASK_PATH))
                logger.info("dynamic_holistic_task_downloaded path=%s", HOLISTIC_TASK_PATH)

            base_options = mp.tasks.BaseOptions(model_asset_path=str(HOLISTIC_TASK_PATH))
            options = mp.tasks.vision.HolisticLandmarkerOptions(
                base_options=base_options,
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
            )
            self.holistic = mp.tasks.vision.HolisticLandmarker.create_from_options(options)
            logger.info("dynamic_holistic_ready")
        except Exception as error:
            logger.warning("dynamic_holistic_unavailable error=%s", error)

    def _load_model(self) -> None:
        if not CHECKPOINT_PATH.exists():
            raise FileNotFoundError(f"Dynamic checkpoint not found: {CHECKPOINT_PATH}")

        logger.info("dynamic_checkpoint_loading path=%s", CHECKPOINT_PATH)
        checkpoint = torch.load(CHECKPOINT_PATH, map_location=self.device)
        actions = checkpoint.get("actions")
        if not actions:
            raise RuntimeError("actions missing in dynamic checkpoint")

        self.actions = [str(word) for word in actions]
        self.action_to_idx = {word: idx for idx, word in enumerate(self.actions)}
        self.action_lookup = {word.lower(): word for word in self.actions}

        self.model = ASLFeatureExtractor(
            input_dim=int(checkpoint.get("feat_dim", FEATURE_DIM)),
            num_classes=len(self.actions),
            d_model=int(checkpoint.get("d_model", 96)),
            n_heads=int(checkpoint.get("n_heads", 4)),
            n_layers=int(checkpoint.get("n_layers", 3)),
            d_ff=int(checkpoint.get("d_ff", 192)),
            dropout=float(checkpoint.get("dropout", 0.1)),
            embedding_dim=int(checkpoint.get("embedding_dim", 96)),
        ).to(self.device)

        self.model.load_state_dict(checkpoint["model_state"], strict=True)
        self.model.eval()
        logger.info("dynamic_checkpoint_loaded classes=%s", len(self.actions))

    @staticmethod
    def _decode_image(image_data: str) -> np.ndarray:
        payload = image_data.split(",", 1)[1] if "," in image_data else image_data
        raw = b64decode(payload)
        image = Image.open(BytesIO(raw)).convert("RGB")
        return np.asarray(image, dtype=np.uint8)

    @staticmethod
    def _normalize_hand(hand_array: np.ndarray) -> np.ndarray:
        if np.all(hand_array == 0):
            return hand_array
        pts = hand_array.reshape(HAND_LM, 3)
        center = pts[WRIST_IDX].copy()
        pts_c = pts - center
        scale = np.linalg.norm(pts_c[MIDDLE_MCP_IDX])
        if scale < EPS:
            scale = 1.0
        return (pts_c / scale).ravel()

    @staticmethod
    def _landmarks_to_array(landmarks: Any, count: int) -> np.ndarray:
        arr = np.zeros((count, 3), dtype=np.float32)
        if not landmarks:
            return arr.ravel()
        n = min(count, len(landmarks))
        for i in range(n):
            lm = landmarks[i]
            arr[i] = [float(lm.x), float(lm.y), float(lm.z)]
        return arr.ravel()

    def _extract_features(self, image_data: str) -> np.ndarray:
        frame = self._decode_image(image_data)

        if self.holistic is None:
            return np.zeros(FEATURE_DIM, dtype=np.float32)

        try:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
            result = self.holistic.detect(mp_image)
        except Exception:
            return np.zeros(FEATURE_DIM, dtype=np.float32)

        face = self._landmarks_to_array(getattr(result, "face_landmarks", None), FACE_LM)
        pose = self._landmarks_to_array(getattr(result, "pose_landmarks", None), POSE_LM)
        left = self._landmarks_to_array(getattr(result, "left_hand_landmarks", None), HAND_LM)
        right = self._landmarks_to_array(getattr(result, "right_hand_landmarks", None), HAND_LM)

        left = self._normalize_hand(left)
        right = self._normalize_hand(right)

        feature = np.concatenate([face, pose, left, right]).astype(np.float32)
        if feature.shape[0] != FEATURE_DIM:
            corrected = np.zeros(FEATURE_DIM, dtype=np.float32)
            n = min(FEATURE_DIM, feature.shape[0])
            corrected[:n] = feature[:n]
            return corrected
        return feature

    def encode_sequence(self, frame_data: list[str]) -> torch.Tensor:
        frames = list(frame_data)
        if not frames:
            raise ValueError("At least one frame is required")

        if len(frames) < NUM_SAMPLED_FRAMES:
            sampled_frames = frames + [frames[-1]] * (NUM_SAMPLED_FRAMES - len(frames))
        else:
            sample_idx = np.linspace(0, len(frames) - 1, NUM_SAMPLED_FRAMES, dtype=int)
            sampled_frames = [frames[int(idx)] for idx in sample_idx]

        sequence = np.stack([self._extract_features(frame) for frame in sampled_frames], axis=0)
        return torch.from_numpy(sequence).float().unsqueeze(0).to(self.device)

    def _resolve_target(self, target_word: str) -> str:
        raw = target_word.strip()
        if not raw:
            raise ValueError("Target word is required")
        normalized = raw.lower()
        canonical = self.action_lookup.get(normalized)
        if canonical is None:
            raise KeyError(raw)
        return canonical

    def verify(self, target_word: str, frame_data: list[str], top_k: int = 5, threshold: float = 0.40) -> dict[str, Any]:
        canonical_target = self._resolve_target(target_word)
        logger.info(
            "dynamic_verify_start target=%s frame_count=%s top_k=%s threshold=%.3f",
            canonical_target,
            len(frame_data),
            top_k,
            threshold,
        )

        x = self.encode_sequence(frame_data)
        with torch.no_grad():
            logits = self.model(x)[0]
            probs = F.softmax(logits, dim=0)

        top_k = max(1, min(int(top_k), len(self.actions)))
        top_probs, top_idx = torch.topk(probs, top_k)

        top_matches = []
        for prob, idx in zip(top_probs, top_idx):
            word = self.actions[int(idx.item())]
            top_matches.append({"word": word, "similarity": float(prob.item())})

        best_idx = int(top_idx[0].item())
        best_match = self.actions[best_idx]
        best_similarity = float(top_probs[0].item())

        target_idx = self.action_to_idx[canonical_target]
        target_similarity = float(probs[target_idx].item())

        ranked_idx = torch.argsort(probs, descending=True)
        target_rank = next((rank + 1 for rank, idx in enumerate(ranked_idx.tolist()) if idx == target_idx), None)

        soft_threshold = max(0.12, threshold * 0.5)
        is_match = (
            target_similarity >= threshold
            or (best_match == canonical_target and target_similarity >= soft_threshold)
            or (target_rank is not None and target_rank <= 2 and target_similarity >= soft_threshold)
        )

        logger.info(
            "dynamic_verify_result target=%s best=%s target_rank=%s target_sim=%.4f best_sim=%.4f match=%s",
            canonical_target,
            best_match,
            target_rank,
            target_similarity,
            best_similarity,
            is_match,
        )

        return {
            "target_word": canonical_target,
            "best_match": best_match,
            "similarity": best_similarity,
            "target_similarity": target_similarity,
            "target_rank": target_rank,
            "threshold": threshold,
            "is_match": is_match,
            "top_matches": top_matches,
            "message": "Match confirmed" if is_match else f"Keep trying (target rank: {target_rank})",
        }


_DYNAMIC_SERVICE: GestureRecognitionService | None = None
_DYNAMIC_INITIALIZING = False
_DYNAMIC_ERROR: str | None = None
_DYNAMIC_LOCK = threading.Lock()


def _dynamic_warmup_worker() -> None:
    global _DYNAMIC_SERVICE, _DYNAMIC_INITIALIZING, _DYNAMIC_ERROR

    built_service: GestureRecognitionService | None = None
    build_error: str | None = None

    try:
        logger.info("dynamic_warmup_worker_start")
        built_service = GestureRecognitionService()
    except Exception as error:
        build_error = str(error)
        logger.exception("dynamic_warmup_worker_failed")

    with _DYNAMIC_LOCK:
        _DYNAMIC_SERVICE = built_service
        _DYNAMIC_ERROR = build_error
        _DYNAMIC_INITIALIZING = False
        logger.info("dynamic_warmup_worker_done ready=%s error=%s", built_service is not None, build_error)


def start_dynamic_service_warmup(force_reset: bool = False) -> bool:
    """
    Start dynamic model warmup in the background.
    Returns True if a new warmup thread was started.
    """
    global _DYNAMIC_SERVICE, _DYNAMIC_INITIALIZING, _DYNAMIC_ERROR

    with _DYNAMIC_LOCK:
        if force_reset:
            _DYNAMIC_SERVICE = None
            _DYNAMIC_ERROR = None

        if _DYNAMIC_SERVICE is not None or _DYNAMIC_INITIALIZING:
            return False

        _DYNAMIC_INITIALIZING = True
        _DYNAMIC_ERROR = None

        thread = threading.Thread(target=_dynamic_warmup_worker, daemon=True, name="dynamic-service-warmup")
        thread.start()
        logger.info("dynamic_warmup_thread_started")
        return True


def get_dynamic_service(wait: bool = True, timeout_seconds: float = 0.0) -> GestureRecognitionService:
    """
    Get dynamic gesture service singleton.

    If wait=False and service is still loading, raises RuntimeError immediately.
    If wait=True, waits until service is ready or timeout is hit.
    """
    global _DYNAMIC_SERVICE, _DYNAMIC_ERROR

    if _DYNAMIC_SERVICE is not None:
        return _DYNAMIC_SERVICE

    start_dynamic_service_warmup()

    if not wait:
        raise RuntimeError("Dynamic gesture service is still initializing")

    deadline = None if timeout_seconds <= 0 else (time.monotonic() + timeout_seconds)
    while True:
        if _DYNAMIC_SERVICE is not None:
            return _DYNAMIC_SERVICE

        if _DYNAMIC_ERROR:
            raise RuntimeError(_DYNAMIC_ERROR)

        if deadline is not None and time.monotonic() >= deadline:
            raise RuntimeError("Dynamic gesture service is still initializing")

        time.sleep(0.05)


def get_dynamic_service_status() -> dict[str, Any]:
    with _DYNAMIC_LOCK:
        service = _DYNAMIC_SERVICE
        return {
            "initializing": _DYNAMIC_INITIALIZING,
            "ready": service is not None,
            "error": _DYNAMIC_ERROR,
            "available": service is not None,
            "classes": len(service.actions) if service is not None else 0,
        }


def reset_dynamic_service() -> None:
    global _DYNAMIC_SERVICE, _DYNAMIC_INITIALIZING, _DYNAMIC_ERROR
    with _DYNAMIC_LOCK:
        _DYNAMIC_SERVICE = None
        _DYNAMIC_INITIALIZING = False
        _DYNAMIC_ERROR = None


def get_gesture_service() -> GestureRecognitionService:
    """Backward-compatible alias for previous imports."""
    return get_dynamic_service(wait=True)

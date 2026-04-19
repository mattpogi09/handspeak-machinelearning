"""
processing.py
-------------
Converts Kaggle "asl-signs" parquet landmark files into .npy keypoint
sequences that train.py can consume.

Stack: Python 3.14 | PyTorch | MediaPipe Tasks API | multithreaded

Dataset layout expected on disk
--------------------------------
asl_signs/
    train.csv
    sign_to_prediction_index_map.json
    train_landmark_files/
        <participant_id>/
            <sequence_id>.parquet

Each parquet row = one landmark for one frame (LONG format):
    frame | type | landmark_index | x | y | z

Output layout
-------------
sign_language_detection/
    MP_Data/
        <sign>/
            <seq_idx>/
                0.npy … (SEQUENCE_LENGTH-1).npy

Usage
-----
    python processing.py

Download the MediaPipe holistic landmarker task file first:
    curl -O https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task
"""

import os
import json
import numpy as np
import pandas as pd
import torch
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from tqdm import tqdm

# ── Signs catalog ─────────────────────────────────────────────────────────────
from signs import SIGNS, BUNDLES, ALL_SIGNS, make_selection

# ── CONFIG ────────────────────────────────────────────────────────────────────
KAGGLE_DIR = "asl-signs"
TRAIN_CSV  = os.path.join(KAGGLE_DIR, "train.csv")

BASE_DIR   = "sign_language_detection"
DATA_PATH  = os.path.join(BASE_DIR, "MP_Data")

# MediaPipe Tasks model file (download separately — see module docstring)
HOLISTIC_TASK_PATH = "holistic_landmarker.task"

# ── Which signs to process ────────────────────────────────────────────────────
SELECTED_SIGNS = ALL_SIGNS

# Max sequences per sign (None = use all available)
MAX_SEQUENCES_PER_SIGN = None

# Frames sampled uniformly from each parquet clip
SEQUENCE_LENGTH = 30

# ── Threading ─────────────────────────────────────────────────────────────────
# RTX 3050 has 4 GB VRAM; parquet processing is CPU-bound, so use CPU threads.
# Keep one thread per physical core to avoid GIL contention on parquet I/O.
NUM_WORKERS = min(8, (os.cpu_count() or 4))

# ── Landmark layout (1629-dim) ────────────────────────────────────────────────
FACE_LM  = 468
POSE_LM  = 33
HAND_LM  = 21

FACE_DIM = FACE_LM * 3   # 1404
POSE_DIM = POSE_LM * 3   #   99
HAND_DIM = HAND_LM * 3   #   63
FEAT_DIM = FACE_DIM + POSE_DIM + HAND_DIM * 2  # 1629

FACE_END = FACE_DIM
POSE_END = FACE_END + POSE_DIM
LH_END   = POSE_END + HAND_DIM
RH_END   = LH_END   + HAND_DIM

TYPES  = ["face", "pose", "left_hand", "right_hand"]
COUNTS = {"face": FACE_LM, "pose": POSE_LM,
          "left_hand": HAND_LM, "right_hand": HAND_LM}

# ── Hand normalisation ────────────────────────────────────────────────────────
EPS            = 1e-6
WRIST_IDX      = 0
MIDDLE_MCP_IDX = 9

print_lock = Lock()


def normalize_hand(hand_array: np.ndarray) -> np.ndarray:
    """Center at wrist, scale by wrist-to-middle-MCP distance."""
    if np.all(hand_array == 0):
        return hand_array
    pts    = hand_array.reshape(HAND_LM, 3)
    center = pts[WRIST_IDX].copy()
    pts_c  = pts - center
    scale  = np.linalg.norm(pts_c[MIDDLE_MCP_IDX])
    if scale < EPS:
        scale = 1.0
    return (pts_c / scale).ravel()


# ── Long-format frame → keypoint vector ──────────────────────────────────────

def _long_frame_to_keypoint(frame_df: pd.DataFrame) -> np.ndarray:
    """
    Convert one frame's long-format rows into a 1629-dim keypoint vector.
    Schema:  type | landmark_index | x | y | z
    """
    parts = []
    for lm_type in TYPES:
        n      = COUNTS[lm_type]
        arr    = np.zeros((n, 3), dtype=np.float32)
        subset = frame_df[frame_df["type"] == lm_type]
        if not subset.empty:
            idx   = subset["landmark_index"].values.astype(int)
            valid = (idx >= 0) & (idx < n)
            idx   = idx[valid]
            xyz   = subset[["x", "y", "z"]].values[valid].astype(np.float32)
            arr[idx] = np.nan_to_num(xyz, nan=0.0)
        parts.append(arr.ravel())
    return np.concatenate(parts)   # (1629,)


# ── Parquet → keypoint sequence ───────────────────────────────────────────────

def parquet_to_keypoints(parquet_path: str) -> list[np.ndarray]:
    """
    Read one parquet file; return exactly SEQUENCE_LENGTH keypoint vectors.
    Returns [] on failure.
    """
    try:
        df = pd.read_parquet(
            parquet_path,
            columns=["frame", "type", "landmark_index", "x", "y", "z"],
        )
    except Exception as exc:
        with print_lock:
            print(f"\n    ⚠  Could not read {parquet_path}: {exc}")
        return []

    df["frame"] = df["frame"].astype(int)
    frames = sorted(df["frame"].unique())
    if not frames:
        return []

    sample_idx     = np.linspace(0, len(frames) - 1, SEQUENCE_LENGTH, dtype=int)
    sampled_frames = [frames[i] for i in sample_idx]

    keypoints: list[np.ndarray] = []
    for fid in sampled_frames:
        kp = _long_frame_to_keypoint(df[df["frame"] == fid])
        kp[POSE_END:LH_END] = normalize_hand(kp[POSE_END:LH_END])
        kp[LH_END:RH_END]   = normalize_hand(kp[LH_END:RH_END])
        keypoints.append(kp)

    return keypoints


# ── Worker: process one (sign, seq_idx, row) tuple ───────────────────────────

def _process_row(args: tuple) -> tuple[bool, str]:
    """
    Process a single parquet sequence and save .npy files.
    Returns (success: bool, message: str).
    """
    sign, seq_idx, parquet_path, sign_out = args
    keypoints = parquet_to_keypoints(parquet_path)

    if len(keypoints) != SEQUENCE_LENGTH:
        return False, f"Skipped ({len(keypoints)} frames): {parquet_path}"

    seq_dir = os.path.join(sign_out, str(seq_idx))
    os.makedirs(seq_dir, exist_ok=True)

    for frame_num, kp in enumerate(keypoints):
        np.save(os.path.join(seq_dir, f"{frame_num}.npy"), kp)

    return True, ""


# ── GPU info (informational) ──────────────────────────────────────────────────

def _print_device_info():
    if torch.cuda.is_available():
        props = torch.cuda.get_device_properties(0)
        mem   = props.total_memory / (1024 ** 3)
        print(f"  GPU   : {props.name}  ({mem:.1f} GB VRAM)")
        print(f"  CUDA  : {torch.version.cuda}")
    else:
        print("  GPU   : not available — running on CPU")
    print(f"  Workers (threads): {NUM_WORKERS}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("\n═══ processing.py  (PyTorch / MediaPipe Tasks edition) ═══\n")
    _print_device_info()

    if not os.path.exists(TRAIN_CSV):
        raise FileNotFoundError(
            f"train.csv not found at '{TRAIN_CSV}'.\n"
            f"Make sure the Kaggle dataset is in '{KAGGLE_DIR}/'."
        )

    df_train = pd.read_csv(TRAIN_CSV)
    print(f"\nLoaded train.csv  — {len(df_train):,} sequences, "
          f"{df_train['sign'].nunique()} unique signs.")

    available = set(df_train["sign"].unique())
    missing   = set(SELECTED_SIGNS) - available
    if missing:
        print(f"⚠  Signs not in dataset (skipped): {missing}")

    df_train = df_train[df_train["sign"].isin(SELECTED_SIGNS)]
    print(f"   Processing {df_train['sign'].nunique()} signs, "
          f"{len(df_train):,} sequences total.\n")

    os.makedirs(DATA_PATH, exist_ok=True)

    total_saved  = 0
    total_failed = 0

    for sign in SELECTED_SIGNS:
        if sign not in available:
            continue

        sign_df  = df_train[df_train["sign"] == sign]
        if MAX_SEQUENCES_PER_SIGN is not None:
            sign_df = sign_df.head(MAX_SEQUENCES_PER_SIGN)

        sign_out = os.path.join(DATA_PATH, sign)
        os.makedirs(sign_out, exist_ok=True)

        print(f"  ▶  {sign}  ({len(sign_df)} sequences)  — {NUM_WORKERS} threads")

        # Build task list
        tasks = [
            (sign, seq_idx, os.path.join(KAGGLE_DIR, row["path"]), sign_out)
            for seq_idx, (_, row) in enumerate(sign_df.iterrows())
        ]

        saved  = 0
        failed = 0

        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            futures = {executor.submit(_process_row, t): t for t in tasks}
            with tqdm(total=len(tasks), desc=f"    {sign}", unit="seq",
                      leave=False, dynamic_ncols=True) as pbar:
                for fut in as_completed(futures):
                    ok, msg = fut.result()
                    if ok:
                        saved += 1
                    else:
                        failed += 1
                        if msg:
                            with print_lock:
                                tqdm.write(f"    ✗  {msg}")
                    pbar.update(1)

        print(f"    ✅  Saved {saved}  |  ✗ Skipped {failed}")
        total_saved  += saved
        total_failed += failed

    print(f"\n{'─'*50}")
    print(f"Done  →  {DATA_PATH}")
    print(f"  Feature dim     : {FEAT_DIM}")
    print(f"  Sequence length : {SEQUENCE_LENGTH}")
    print(f"  Signs processed : {len(SELECTED_SIGNS)}")
    print(f"  Total saved     : {total_saved}")
    print(f"  Total skipped   : {total_failed}")
    print(f"{'─'*50}\n")


if __name__ == "__main__":
    main()
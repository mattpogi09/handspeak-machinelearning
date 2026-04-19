"""
Shared landmark normalization for hand-size and position invariance.
MediaPipe: 21 landmarks per hand (0=wrist, 9=middle MCP), 63 values per hand, 126 total for 2 hands.
"""
import numpy as np

LANDMARKS_PER_HAND = 21
DIMS_PER_LANDMARK = 3
VALUES_PER_HAND = LANDMARKS_PER_HAND * DIMS_PER_LANDMARK  # 63
FRAME_SIZE = 2 * VALUES_PER_HAND  # 126
WRIST_IDX = 0
MIDDLE_MCP_IDX = 9
EPS = 1e-6


def normalize_frame_landmarks(frame_landmarks):
    """
    Make landmarks translation- and scale-invariant per hand.
    Center at wrist (landmark 0), scale by wrist-to-middle-MCP (landmark 9) distance.
    Input: length-126 list or array (hand0: 0-62, hand1: 63-125).
    Output: 126-dim float32 array.
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

        points = hand.reshape(LANDMARKS_PER_HAND, DIMS_PER_LANDMARK)
        center = points[WRIST_IDX].copy()
        points_centered = points - center
        scale = np.linalg.norm(points_centered[MIDDLE_MCP_IDX])
        if scale < EPS:
            scale = 1.0
        points_normalized = points_centered / scale
        out[hand_start : hand_start + VALUES_PER_HAND] = points_normalized.ravel()

    return out

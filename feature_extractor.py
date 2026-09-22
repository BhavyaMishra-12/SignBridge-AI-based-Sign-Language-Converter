from typing import Sequence
import numpy as np

FEATURE_COUNT = 63  # 21 landmarks × x, y, z
TWO_HAND_FEATURE_COUNT = 128  # left 63 + right 63 + two presence flags


def extract_features(landmarks: Sequence, handedness: str | None = None) -> np.ndarray:
    """Return a wrist-relative and scale-normalized 63-value vector."""
    points = np.asarray([(point.x, point.y, point.z) for point in landmarks], dtype=np.float32)
    if points.shape != (21, 3):
        raise ValueError("Expected exactly 21 MediaPipe hand landmarks.")
    relative = points - points[0]
    scale = np.linalg.norm(relative[9])  # wrist to middle-finger MCP
    if scale < 1e-6:
        raise ValueError("Cannot normalize a hand with zero size.")
    relative /= scale
    if handedness == "Left":
        relative[:, 0] *= -1  # canonicalize left hands to right-hand coordinates
    return relative.reshape(FEATURE_COUNT)


def extract_two_hand_features(hands: Sequence) -> np.ndarray:
    """Return a fixed-size vector for zero, one, or two detected hands.

    The first 63 values belong to the left hand, the next 63 to the right
    hand, followed by left/right presence flags. Missing hands are zero-filled.
    """
    left_features = np.zeros(FEATURE_COUNT, dtype=np.float32)
    right_features = np.zeros(FEATURE_COUNT, dtype=np.float32)
    left_present, right_present = 0.0, 0.0
    for hand in hands:
        features = extract_features(hand["landmarks"].landmark, hand["handedness"])
        if hand["handedness"] == "Left":
            left_features, left_present = features, 1.0
        else:
            right_features, right_present = features, 1.0
    return np.concatenate((left_features, right_features, [left_present, right_present])).astype(np.float32)

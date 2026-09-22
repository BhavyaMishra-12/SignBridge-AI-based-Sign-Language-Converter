"""Function-based MediaPipe helpers for SignBridge."""

import cv2
import mediapipe as mp

MP_HANDS = mp.solutions.hands
MP_DRAWING = mp.solutions.drawing_utils


def create_hand_tracker(max_num_hands=2):
    """Create and return one MediaPipe hand-tracking instance."""
    return MP_HANDS.Hands(static_image_mode=False, max_num_hands=max_num_hands, min_detection_confidence=0.7, min_tracking_confidence=0.7)


def detect_hands(tracker, frame):
    """Return dictionaries containing landmarks, hand side, and confidence."""
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb_frame.flags.writeable = False
    result = tracker.process(rgb_frame)
    rgb_frame.flags.writeable = True
    if not result.multi_hand_landmarks:
        return []
    hands = []
    for index, landmarks in enumerate(result.multi_hand_landmarks):
        classification = result.multi_handedness[index].classification[0]
        hands.append({"landmarks": landmarks, "handedness": classification.label, "confidence": classification.score})
    return hands


def draw_hand(frame, hand):
    """Draw a hand skeleton and its handedness label on an OpenCV frame."""
    MP_DRAWING.draw_landmarks(frame, hand["landmarks"], MP_HANDS.HAND_CONNECTIONS)
    wrist = hand["landmarks"].landmark[MP_HANDS.HandLandmark.WRIST]
    height, width = frame.shape[:2]
    cv2.putText(frame, f"{hand['handedness']} {hand['confidence']:.0%}", (int(wrist.x * width), max(25, int(wrist.y * height) - 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2, cv2.LINE_AA)


def fingers_up(landmarks, handedness):
    """Return [thumb, index, middle, ring, pinky] for either hand."""
    thumb_is_up = landmarks[4].x < landmarks[3].x if handedness == "Right" else landmarks[4].x > landmarks[3].x
    return [int(thumb_is_up), *[int(landmarks[tip].y < landmarks[tip - 2].y) for tip in (8, 12, 16, 20)]]


def close_hand_tracker(tracker):
    """Release MediaPipe resources when the webcam loop ends."""
    tracker.close()

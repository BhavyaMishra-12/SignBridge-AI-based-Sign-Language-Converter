import json
from collections import Counter, deque
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf

from feature_extractor import TWO_HAND_FEATURE_COUNT, extract_two_hand_features
from hand_detector import close_hand_tracker, create_hand_tracker, detect_hands, draw_hand


MODEL_PATH = Path("models") / "two_hand_sign_classifier.keras"
LABELS_PATH = Path("models") / "two_hand_labels.json"
CONFIDENCE_THRESHOLD = 0.75
SMOOTHING_WINDOW = 8
STABLE_FRAMES = 6


def load_predictor():
    """Load the trained Keras model and its label-ID mapping."""
    if not MODEL_PATH.exists() or not LABELS_PATH.exists():
        raise FileNotFoundError("No trained model found. Run train.py first.")
    model = tf.keras.models.load_model(MODEL_PATH)
    if model.input_shape[-1] != TWO_HAND_FEATURE_COUNT:
        raise ValueError("This is an older one-hand model. Run train.py after collecting two-hand samples.")
    return model, json.loads(LABELS_PATH.read_text(encoding="utf-8"))


def get_stable_label(predictions):
    """Return a label only if it appears consistently in recent frames."""
    if not predictions:
        return None
    label, count = Counter(predictions).most_common(1)[0]
    return label if label != "UNCERTAIN" and count >= STABLE_FRAMES else None


def draw_prediction(frame, label, confidence, stable_label):
    text = f"Prediction: {label} ({confidence:.0%})"
    color = (0, 255, 0) if stable_label else (0, 200, 255)
    cv2.putText(frame, text, (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.75, color, 2, cv2.LINE_AA)
    if stable_label:
        cv2.putText(frame, f"Accepted: {stable_label}", (12, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2, cv2.LINE_AA)


def main():
    model, labels = load_predictor()
    tracker, camera = create_hand_tracker(max_num_hands=2), cv2.VideoCapture(0)
    if not camera.isOpened():
        close_hand_tracker(tracker)
        raise RuntimeError("Could not open camera 0.")
    predictions = deque(maxlen=SMOOTHING_WINDOW)

    try:
        while True:
            success, frame = camera.read()
            if not success:
                break
            frame = cv2.flip(frame, 1)
            hands = detect_hands(tracker, frame)
            if hands:
                for hand in hands:
                    draw_hand(frame, hand)
                features = extract_two_hand_features(hands)
                probabilities = model.predict(np.expand_dims(features, axis=0), verbose=0)[0]
                label_id = int(np.argmax(probabilities))
                label, confidence = labels[label_id], float(probabilities[label_id])
                predictions.append(label if confidence >= CONFIDENCE_THRESHOLD else "UNCERTAIN")
                stable_label = get_stable_label(predictions)
                draw_prediction(frame, label, confidence, stable_label)
            else:
                predictions.clear()
                cv2.putText(frame, "Show one hand to the camera", (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 200, 255), 2, cv2.LINE_AA)

            cv2.imshow("SignBridge Prediction", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                break
    finally:
        camera.release()
        close_hand_tracker(tracker)
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

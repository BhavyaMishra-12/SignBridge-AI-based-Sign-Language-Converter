"""Local web server for the SignBridge live prototype.

Run: .\\venv\\Scripts\\python.exe web_server.py
Then open: http://127.0.0.1:8000
"""

import base64
import csv
import json
import mimetypes
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import cv2
import numpy as np
import tensorflow as tf

from feature_extractor import FEATURE_COUNT, TWO_HAND_FEATURE_COUNT, extract_features, extract_two_hand_features
from hand_detector import close_hand_tracker, create_hand_tracker, detect_hands


HOST = "127.0.0.1"
PORT = 8000
WEB_DIR = Path(__file__).parent / "web"
MODELS_DIR = Path(__file__).parent / "models"
DATASET_PATH = Path(__file__).parent / "data" / "two_hand_landmarks.csv"
MODEL_LOCK = threading.RLock()
TRACKER_LOCK = threading.Lock()
TRAINING = {"running": False, "message": "Ready to train", "last_accuracy": None}


def load_classifier():
    """Prefer the two-hand model, with a safe fallback to the one-hand model."""
    candidates = [
        (MODELS_DIR / "two_hand_sign_classifier.keras", MODELS_DIR / "two_hand_labels.json"),
        (MODELS_DIR / "sign_classifier.keras", MODELS_DIR / "labels.json"),
    ]
    for model_path, labels_path in candidates:
        if model_path.exists() and labels_path.exists():
            model = tf.keras.models.load_model(model_path)
            labels = json.loads(labels_path.read_text(encoding="utf-8"))
            feature_count = model.input_shape[-1]
            if feature_count not in (FEATURE_COUNT, TWO_HAND_FEATURE_COUNT):
                raise ValueError(f"Unsupported model input size: {feature_count}")
            return model, labels, feature_count, model_path.name
    raise FileNotFoundError("No trained model was found. Run train.py before starting the web prototype.")


MODEL, LABELS, MODEL_FEATURE_COUNT, MODEL_NAME = load_classifier()
TRACKER = create_hand_tracker(max_num_hands=2)


def decode_frame(image_data):
    """Decode a base64 JPEG data URL sent from the browser camera."""
    _, encoded = image_data.split(",", 1)
    image_bytes = base64.b64decode(encoded)
    frame = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("The camera frame could not be decoded.")
    return frame


def predict(image_data):
    frame = decode_frame(image_data)
    with TRACKER_LOCK:
        hands = detect_hands(TRACKER, frame)
    hand_data = [{"handedness": hand["handedness"], "confidence": round(float(hand["confidence"]), 3)} for hand in hands]
    if not hands:
        return {"detected": False, "hands": [], "label": None, "confidence": 0.0}

    if MODEL_FEATURE_COUNT == TWO_HAND_FEATURE_COUNT:
        features = extract_two_hand_features(hands)
    else:
        hand = hands[0]
        features = extract_features(hand["landmarks"].landmark, hand["handedness"])

    with MODEL_LOCK:
        probabilities = MODEL.predict(np.expand_dims(features, axis=0), verbose=0)[0]
    label_id = int(np.argmax(probabilities))
    return {
        "detected": True,
        "hands": hand_data,
        "label": LABELS[label_id],
        "confidence": round(float(probabilities[label_id]), 4),
    }


def dataset_summary():
    """Return existing labels and their sample counts for the training studio."""
    if not DATASET_PATH.exists():
        return {}
    with DATASET_PATH.open(newline="", encoding="utf-8") as file:
        counts = {}
        for row in csv.DictReader(file):
            counts[row["label"]] = counts.get(row["label"], 0) + 1
    return dict(sorted(counts.items()))


def save_training_sample(label, image_data, min_hands):
    """Extract landmarks from one browser frame and append a labeled CSV row."""
    clean_label = label.strip().upper().replace(" ", "_")
    if not clean_label or not clean_label.replace("_", "").isalnum():
        raise ValueError("Use letters, numbers, spaces, or underscores for a symbol name.")
    if min_hands not in (1, 2):
        raise ValueError("min_hands must be 1 or 2.")
    with TRACKER_LOCK:
        hands = detect_hands(TRACKER, decode_frame(image_data))
    if len(hands) < min_hands:
        return {"saved": False, "hands": len(hands), "reason": f"Show {min_hands} hand(s) before saving."}
    features = extract_two_hand_features(hands)
    DATASET_PATH.parent.mkdir(exist_ok=True)
    is_new_file = not DATASET_PATH.exists() or DATASET_PATH.stat().st_size == 0
    with DATASET_PATH.open("a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if is_new_file:
            writer.writerow(["label", *[f"feature_{index}" for index in range(TWO_HAND_FEATURE_COUNT)]])
        writer.writerow([clean_label, *features])
    return {"saved": True, "label": clean_label, "hands": len(hands), "samples": dataset_summary().get(clean_label, 0)}


def train_in_background():
    """Train from the two-hand CSV, then hot-reload the model used by the API."""
    global MODEL, LABELS, MODEL_FEATURE_COUNT, MODEL_NAME
    try:
        TRAINING.update(running=True, message="Training the classifier…")
        import train
        train.main()
        with MODEL_LOCK:
            MODEL, LABELS, MODEL_FEATURE_COUNT, MODEL_NAME = load_classifier()
        metrics_path = MODELS_DIR / "two_hand_training_metrics.json"
        metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        TRAINING.update(running=False, message="Model updated and ready", last_accuracy=metrics.get("test_accuracy"))
    except Exception as error:
        print(f"Training error: {error}")
        TRAINING.update(running=False, message=f"Training failed: {error}")


def start_training():
    if TRAINING["running"]:
        return False
    threading.Thread(target=train_in_background, daemon=True).start()
    return True


class SignBridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Keep request logging concise."""
        print(f"[web] {args[0]}")

    def send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self.send_json({"status": "ready", "model": MODEL_NAME, "labels": LABELS, "feature_count": MODEL_FEATURE_COUNT, "training": TRAINING})
            return
        if path == "/api/classes":
            self.send_json({"classes": dataset_summary(), "total": sum(dataset_summary().values())})
            return
        relative_path = "index.html" if path == "/" else path.lstrip("/")
        file_path = (WEB_DIR / relative_path).resolve()
        if WEB_DIR.resolve() not in file_path.parents and file_path != WEB_DIR.resolve():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content = file_path.read_bytes()
        mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if mime_type.startswith("text/") else mime_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/predict", "/api/collect", "/api/train"):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length))
            if path == "/api/predict":
                response = predict(payload["image"])
            elif path == "/api/collect":
                response = save_training_sample(payload["label"], payload["image"], int(payload.get("min_hands", 1)))
            else:
                response = {"started": start_training(), "training": TRAINING}
            self.send_json(response)
        except (KeyError, ValueError, json.JSONDecodeError) as error:
            self.send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except Exception as error:
            print(f"Prediction error: {error}")
            self.send_json({"error": "Prediction failed. Check the server terminal."}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main():
    server = ThreadingHTTPServer((HOST, PORT), SignBridgeHandler)
    print(f"SignBridge prototype ready at http://{HOST}:{PORT}")
    print(f"Model: {MODEL_NAME} | Labels: {', '.join(LABELS)}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping SignBridge server.")
    finally:
        server.server_close()
        close_hand_tracker(TRACKER)


if __name__ == "__main__":
    main()

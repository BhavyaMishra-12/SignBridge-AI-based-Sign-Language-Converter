import argparse
import csv
from pathlib import Path
import cv2

from feature_extractor import TWO_HAND_FEATURE_COUNT, extract_two_hand_features
from hand_detector import close_hand_tracker, create_hand_tracker, detect_hands, draw_hand


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect SignBridge hand-landmark data.")
    parser.add_argument("--label", required=True, help="Class label, e.g. HELLO")
    parser.add_argument("--samples", type=int, default=200, help="Number of samples to collect")
    parser.add_argument("--output", type=Path, default=Path("data") / "two_hand_landmarks.csv")
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--min-hands", type=int, choices=(1, 2), default=1, help="Hands required before saving a sample")
    args = parser.parse_args()
    if args.samples < 1:
        parser.error("--samples must be at least 1")
    return args


def ensure_header(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.stat().st_size == 0:
        with path.open("w", newline="", encoding="utf-8") as file:
            csv.writer(file).writerow(["label", *[f"feature_{i}" for i in range(TWO_HAND_FEATURE_COUNT)]])


def main() -> None:
    args = parse_args()
    ensure_header(args.output)
    tracker, camera, saved = create_hand_tracker(max_num_hands=2), cv2.VideoCapture(args.camera), 0
    if not camera.isOpened():
        close_hand_tracker(tracker)
        raise RuntimeError(f"Could not open camera {args.camera}.")
    print("Hold S to record samples. Press ESC to quit.")
    try:
        with args.output.open("a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            while saved < args.samples:
                success, frame = camera.read()
                if not success:
                    raise RuntimeError("Could not read a frame from the camera.")
                frame = cv2.flip(frame, 1)
                detected = detect_hands(tracker, frame)
                for hand in detected:
                    draw_hand(frame, hand)
                cv2.putText(frame, f"{args.label}: {saved}/{args.samples} | {len(detected)} hand(s) | Hold S | ESC", (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2, cv2.LINE_AA)
                cv2.imshow("SignBridge Data Collection", frame)
                key = cv2.waitKey(1) & 0xFF
                if key in (ord("s"), ord("S")) and len(detected) >= args.min_hands:
                    writer.writerow([args.label, *extract_two_hand_features(detected)])
                    saved += 1
                if key == 27:
                    break
    finally:
        camera.release()
        close_hand_tracker(tracker)
        cv2.destroyAllWindows()
    print(f"Saved {saved} samples for {args.label} to {args.output}")


if __name__ == "__main__":
    main()

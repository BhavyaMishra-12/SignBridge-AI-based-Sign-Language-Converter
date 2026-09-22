import cv2

from hand_detector import close_hand_tracker, create_hand_tracker, detect_hands, draw_hand, fingers_up


def main() -> None:
    tracker = create_hand_tracker(max_num_hands=2)
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        close_hand_tracker(tracker)
        raise RuntimeError("Could not open camera 0.")

    try:
        while True:
            success, frame = camera.read()
            if not success:
                break
            frame = cv2.flip(frame, 1)
            for hand in detect_hands(tracker, frame):
                draw_hand(frame, hand)
                landmarks = hand["landmarks"].landmark
                print(f"{hand['handedness']} fingers: {fingers_up(landmarks, hand['handedness'])}")
            cv2.imshow("SignBridge Hand Detection", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                break
    finally:
        camera.release()
        close_hand_tracker(tracker)
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

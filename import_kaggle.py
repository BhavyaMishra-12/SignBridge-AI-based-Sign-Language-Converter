import argparse
import csv
import os
from pathlib import Path

import cv2

from feature_extractor import TWO_HAND_FEATURE_COUNT, extract_two_hand_features
from hand_detector import close_hand_tracker, create_hand_tracker, detect_hands

DATASET_PATH = Path("data") / "two_hand_landmarks.csv"

def import_dataset(dataset_dir: str):
    """
    Iterates over a directory structure where each subfolder is a class label,
    reads the images, extracts the 128 coordinate features, and saves them
    to the CSV file used by the SignBridge model.
    """
    dataset_path = Path(dataset_dir)
    if not dataset_path.exists() or not dataset_path.is_dir():
        print(f"Error: Directory '{dataset_dir}' does not exist.")
        return

    # Initialize the hand tracker (MediaPipe)
    tracker = create_hand_tracker(max_num_hands=2)
    
    # Ensure our target CSV directory exists
    DATASET_PATH.parent.mkdir(exist_ok=True)
    is_new_file = not DATASET_PATH.exists() or DATASET_PATH.stat().st_size == 0
    
    total_processed = 0
    total_skipped = 0

    with DATASET_PATH.open("a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        # Write header if file is empty
        if is_new_file:
            writer.writerow(["label", *[f"feature_{index}" for index in range(TWO_HAND_FEATURE_COUNT)]])

        # Iterate through subdirectories (each represents a sign label)
        for label_dir in dataset_path.iterdir():
            if not label_dir.is_dir():
                continue
                
            label = label_dir.name.strip().upper().replace(" ", "_")
            print(f"Processing label: {label}...")
            
            # Read all images in this folder
            for image_file in label_dir.iterdir():
                if image_file.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
                    continue
                
                # Load the image
                frame = cv2.imread(str(image_file))
                if frame is None:
                    print(f"  Failed to read {image_file.name}")
                    continue
                
                # Detect hands using the app's existing detector
                hands = detect_hands(tracker, frame)
                
                # We need at least one hand to extract useful features
                if len(hands) == 0:
                    total_skipped += 1
                    continue
                    
                # Extract the 128 model inputs
                features = extract_two_hand_features(hands)
                
                # Write to the CSV
                writer.writerow([label, *features])
                total_processed += 1

    close_hand_tracker(tracker)
    print("=" * 40)
    print(f"Import Complete!")
    print(f"Successfully processed and added {total_processed} samples.")
    print(f"Skipped {total_skipped} images (no hands detected).")
    print(f"Data saved to {DATASET_PATH.absolute()}")
    print("=" * 40)
    print("You can now train the model by running:")
    print("  python train.py")
    print("Or by clicking 'Train updated model' in the web interface.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import an image dataset to SignBridge CSV.")
    parser.add_argument("dataset_dir", type=str, help="Path to the dataset directory containing label subfolders.")
    args = parser.parse_args()
    
    import_dataset(args.dataset_dir)

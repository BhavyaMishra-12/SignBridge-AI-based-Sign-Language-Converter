import csv
import json
import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf

from feature_extractor import TWO_HAND_FEATURE_COUNT


DATASET_PATH = Path("data") / "two_hand_landmarks.csv"
MODEL_PATH = Path("models") / "two_hand_sign_classifier.keras"
LABELS_PATH = Path("models") / "two_hand_labels.json"
METRICS_PATH = Path("models") / "two_hand_training_metrics.json"
TEST_FRACTION = 0.2
RANDOM_SEED = 42


def load_dataset(path):
    """Load CSV rows into model inputs, numeric label IDs, and label names."""
    with path.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))
    if not rows:
        raise ValueError("The dataset is empty. Collect samples before training.")

    labels = sorted({row["label"] for row in rows})
    if len(labels) < 2:
        raise ValueError("Collect at least two different labels before training.")
    label_to_id = {label: index for index, label in enumerate(labels)}

    features = np.asarray(
        [[float(row[f"feature_{index}"]) for index in range(TWO_HAND_FEATURE_COUNT)] for row in rows],
        dtype=np.float32,
    )
    targets = np.asarray([label_to_id[row["label"]] for row in rows], dtype=np.int32)
    return features, targets, labels


def stratified_split(features, targets, test_fraction=TEST_FRACTION):
    """Keep examples of every label in both training and test sets."""
    rng = np.random.default_rng(RANDOM_SEED)
    train_indices, test_indices = [], []
    for label_id in np.unique(targets):
        indices = np.flatnonzero(targets == label_id)
        rng.shuffle(indices)
        test_count = max(1, round(len(indices) * test_fraction))
        test_indices.extend(indices[:test_count])
        train_indices.extend(indices[test_count:])
    rng.shuffle(train_indices)
    rng.shuffle(test_indices)
    return features[train_indices], features[test_indices], targets[train_indices], targets[test_indices]


def build_model(label_count):
    """Create a small dense network for two-hand landmark features."""
    model = tf.keras.Sequential(
        [
            tf.keras.Input(shape=(TWO_HAND_FEATURE_COUNT,)),
            tf.keras.layers.Dense(128, activation="relu"),
            tf.keras.layers.Dropout(0.25),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dropout(0.15),
            tf.keras.layers.Dense(label_count, activation="softmax"),
        ]
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main():
    tf.keras.utils.set_random_seed(RANDOM_SEED)
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"{DATASET_PATH} is missing. Collect two-hand samples first.")
    features, targets, labels = load_dataset(DATASET_PATH)
    x_train, x_test, y_train, y_test = stratified_split(features, targets)
    print(f"Loaded {len(features)} samples for: {', '.join(labels)}")
    print(f"Training: {len(x_train)} | Testing: {len(x_test)}")

    model = build_model(len(labels))
    callbacks = [tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=15, restore_best_weights=True)]
    model.fit(x_train, y_train, validation_data=(x_test, y_test), epochs=150, batch_size=32, callbacks=callbacks, verbose=2)
    loss, accuracy = model.evaluate(x_test, y_test, verbose=0)

    MODEL_PATH.parent.mkdir(exist_ok=True)
    model.save(MODEL_PATH)
    LABELS_PATH.write_text(json.dumps(labels, indent=2), encoding="utf-8")
    METRICS_PATH.write_text(json.dumps({"test_loss": float(loss), "test_accuracy": float(accuracy), "train_samples": len(x_train), "test_samples": len(x_test)}, indent=2), encoding="utf-8")
    print(f"Test accuracy: {accuracy:.2%}")
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()

# SignBridgeAI – Sign Language to Speech Translator

## 🚀 Overview

SignBridgeAI is a deep learning-based system that translates sign language gestures into meaningful text and speech in real-time using computer vision and NLP techniques.

## ✨ Features

* Real-time hand & pose detection using MediaPipe
* Deep learning-based gesture recognition
* Continuous gesture-to-sentence conversion
* Speech output integration
* Optimized for speed and real-world usability

## 🛠️ Tech Stack

* Python
* TensorFlow
* OpenCV
* MediaPipe
* NLP (NLTK, SpaCy)


## ⚙️ Installation

```bash
git clone <repo-link>
cd project
pip install -r requirements.txt
python app.py
```

## Current milestone: collect landmark data

`app.py` is the live MediaPipe hand-landmark preview. It uses plain functions
instead of application classes, detects up to two hands, shows each hand's
handedness, and retains the finger-up diagnostic.

The next recognition step is to collect training examples as normalized
landmark vectors rather than raw images. For a label such as `HELLO`, run:

```bash
python collect_data.py --label HELLO --samples 200
```

Hold `S` while making the sign to save samples. Samples are appended to
`data/two_hand_landmarks.csv` as a label plus 128 values: 63 normalized
coordinates for the left hand, 63 for the right hand, and two presence flags.
It supports one- and two-hand signs. For signs that require both hands, add
`--min-hands 2`. Press `ESC` to stop. Collect balanced samples for every label
before training a classifier.

## Train and test recognition

After collecting at least two labels in the new two-hand CSV, train a small
TensorFlow classifier:

```bash
python train.py
```

`train.py` creates a test split, trains on the remaining samples, prints test
accuracy, and saves the trained model in `models/`. Start live recognition with:

```bash
python predict.py
```

The prediction window shows the current label and confidence. A label is only
accepted after it is stable in at least 6 of the last 8 frames.

## Web prototype

The browser frontend connects to the same trained local model through a small
Python backend. Start it with:

```bash
python web_server.py
```

Open `http://127.0.0.1:8000`, click **Start camera**, and allow browser camera
access. The browser sends mirrored JPEG frames to the local backend; MediaPipe
extracts landmarks and the saved classifier returns the live label and
confidence. No camera frames are sent to an external service.

Use **Training studio** in the navigation to add your own symbols directly in
the browser. Enter a label, choose whether one or two hands are required, and
save varied landmark samples. The page lists the existing model vocabulary and
sample totals. Once labels are balanced, select **Train updated model**; the
server retrains from `data/two_hand_landmarks.csv` and hot-reloads the new
model when it finishes.

## 📌 Future Improvements

* Improve model accuracy
* Add multilingual support
* Deploy as web application

import os
import numpy as np
import cv2 as cv
import torch
import torch.nn as nn
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request

from utils import normalize_frame_landmarks

# ================= SETTINGS ================= #
SEQUENCE_LENGTH = 30
INPUT_SIZE = 126
HIDDEN_SIZE = 128
NUM_CLASSES = 25
CONF_THRESHOLD = 0.50
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# ============================================ #

label_map = {
    0: "Nothing",
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "E",
    6: "F",
    7: "G",
    8: "H",
    9: "I",
    10: "K",
    11: "L",
    12: "M",
    13: "N",
    14: "O",
    15: "P",
    16: "Q",
    17: "R",
    18: "S",
    19: "T",
    20: "U",
    21: "V",
    22: "W",
    23: "X",
    24: "Y"
    # 1: "A-Left",
    # 2: "A-Right",
    # 3: "B-Left",
    # 4: "B-Right",
    # 5: "C-Left",
    # 6: "C-Right",
    # 7: "D-Left",
    # 8: "D-Right",
    # 9: "E-Left",
    # 10:"E-Right",
    # 11:"F-Left",
    # 12:"F-Right",
}

# Right only
# label_map = {
#     0: "Nothing",
#     1: "A-Right",
#     2: "B-Right",
#     3: "C-Right",
#     4: "D-Right",
#     5:"E-Right",
#     6:"F-Right",
# }

# Left Only
# label_map = {
#     0: "Nothing",
#     1: "A-Left",
#     2: "B-Left",
#     3: "C-Left",
#     4: "D-Left",
#     5: "E-Left",
#     6:"F-Left",
# }

# ---------------- MODEL ---------------- #
class LSTMClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(INPUT_SIZE, HIDDEN_SIZE, batch_first=True)
        self.fc = nn.Linear(HIDDEN_SIZE, NUM_CLASSES)

    def forward(self, x):
        _, (hidden, _) = self.lstm(x)
        return self.fc(hidden[-1])

model = LSTMClassifier().to(DEVICE)
model.load_state_dict(torch.load("best_model.pt", map_location=DEVICE))
model.eval()

# ---------------- MEDIAPIPE ---------------- #
MODEL_PATH = "gesture_recognizer.task"
URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"

if not os.path.exists(MODEL_PATH):
    urllib.request.urlretrieve(URL, MODEL_PATH)

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.GestureRecognizerOptions(
    base_options=base_options,
    num_hands=2
)

recognizer = vision.GestureRecognizer.create_from_options(options)

# ---------------- HAND CONNECTIONS ---------------- #
HAND_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,4),          # Thumb
    (0,5),(5,6),(6,7),(7,8),          # Index
    (5,9),(9,10),(10,11),(11,12),     # Middle
    (9,13),(13,14),(14,15),(15,16),   # Ring
    (13,17),(17,18),(18,19),(19,20),  # Pinky
    (0,17)                            # Palm base
]
# -------------------------------------------------- #

# ---------------- WEBCAM ---------------- #
cap = cv.VideoCapture(0)
sequence = []

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv.flip(frame, 1)
    rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb
    )

    result = recognizer.recognize(mp_image)

    frame_landmarks = []

    if result.hand_landmarks:
        for hand_idx in range(2):
            if hand_idx < len(result.hand_landmarks):
                points = []
                for lm in result.hand_landmarks[hand_idx]:
                    x, y, z = lm.x, lm.y, lm.z
                    frame_landmarks.extend([x, y, z])
                    h, w, _ = frame.shape
                    cx, cy = int(x * w), int(y * h)
                    points.append((cx, cy))
                    cv.circle(frame, (cx, cy), 5, (0, 255, 0), -1)

                # Draw lines between landmarks
                for connection in HAND_CONNECTIONS:
                    start_idx, end_idx = connection
                    cv.line(frame, points[start_idx], points[end_idx], (255, 0, 0), 2)
            else:
                frame_landmarks.extend([0]*63)
    else:
        frame_landmarks.extend([0]*126)

    sequence.append(normalize_frame_landmarks(frame_landmarks))
    if len(sequence) > SEQUENCE_LENGTH:
        sequence.pop(0)

    prediction_text = "Collecting..."

    if len(sequence) == SEQUENCE_LENGTH:
        input_tensor = torch.tensor(
            np.expand_dims(sequence, axis=0),
            dtype=torch.float32
        ).to(DEVICE)

        with torch.no_grad():
            output = model(input_tensor)
            probs = torch.softmax(output, dim=1)
            max_prob, pred_class = torch.max(probs, dim=1)

            max_prob = max_prob.item()
            pred_class = pred_class.item()

            if max_prob < CONF_THRESHOLD:
                prediction_text = "Unidentified"
            else:
                prediction_text = label_map[pred_class]

    cv.putText(
        frame,
        f"Prediction: {prediction_text}",
        (10, 40),
        cv.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv.imshow("ASL Recognition", frame)

    if cv.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv.destroyAllWindows()
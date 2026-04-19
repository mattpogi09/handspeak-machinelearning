import os
import numpy as np
import cv2 as cv
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request

from utils import normalize_frame_landmarks

# ================= SETTINGS ================= #
LABEL = "Y"
SEQUENCE_LENGTH = 30
TARGET_SAMPLES = 200
DATA_PATH = os.path.join("Data", LABEL)
# ============================================ #

os.makedirs(DATA_PATH, exist_ok=True)

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

cap = cv.VideoCapture(0)

sequence = []
sample_count = len(os.listdir(DATA_PATH))
recording = False

# Manual hand connections (21 landmark structure)
HAND_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (5,9),(9,10),(10,11),(11,12),
    (9,13),(13,14),(14,15),(15,16),
    (13,17),(17,18),(18,19),(19,20),
    (0,17)
]

print(f"Collecting {LABEL}... Existing samples: {sample_count}")
print("Press 's' to START")
print("Press 'p' to PAUSE")
print("Press 'q' to QUIT")

while cap.isOpened() and sample_count < TARGET_SAMPLES:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv.flip(frame, 1)
    h, w, _ = frame.shape

    rgb_frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    result = recognizer.recognize(mp_image)

    frame_landmarks = []

    if result.hand_landmarks:

        for idx, hand in enumerate(result.hand_landmarks):

            # ===== DRAW LANDMARK POINTS =====
            points = []
            for lm in hand:
                x = int(lm.x * w)
                y = int(lm.y * h)
                points.append((x, y))
                cv.circle(frame, (x, y), 3, (0,255,0), -1)

            # ===== DRAW CONNECTIONS =====
            for connection in HAND_CONNECTIONS:
                start_idx, end_idx = connection
                cv.line(frame,
                        points[start_idx],
                        points[end_idx],
                        (255,0,0),
                        2)

            # ===== SHOW HANDEDNESS =====
            if result.handedness:
                handed_label = result.handedness[idx][0].category_name
                confidence = result.handedness[idx][0].score

                cv.putText(frame,
                           f"{handed_label} ({confidence:.2f})",
                           (10, 80 + idx*30),
                           cv.FONT_HERSHEY_SIMPLEX,
                           0.7,
                           (0,255,255),
                           2)

        # Always 2 hands (pad if missing)
        for hand_idx in range(2):
            if hand_idx < len(result.hand_landmarks):
                for lm in result.hand_landmarks[hand_idx]:
                    frame_landmarks.extend([lm.x, lm.y, lm.z])
            else:
                frame_landmarks.extend([0] * 63)
    else:
        frame_landmarks.extend([0] * 126)

    # ===== RECORDING LOGIC =====
    if recording:
        sequence.append(normalize_frame_landmarks(frame_landmarks))

        if len(sequence) == SEQUENCE_LENGTH:
            np.save(os.path.join(DATA_PATH, str(sample_count)),
                    np.array(sequence))
            sample_count += 1
            sequence = []
            print(f"Saved sample {sample_count}")

    # ===== UI TEXT =====
    status = "RECORDING" if recording else "PAUSED"
    color = (0,255,0) if recording else (0,0,255)

    cv.putText(frame,
               f"{status} - {sample_count}/{TARGET_SAMPLES}",
               (10, 40),
               cv.FONT_HERSHEY_SIMPLEX,
               1,
               color,
               2)

    cv.imshow("Dataset Collection", frame)

    key = cv.waitKey(1) & 0xFF

    if key == ord('q'):
        break
    elif key == ord('s'):
        recording = True
        print("Recording started")
    elif key == ord('p'):
        recording = False
        sequence = []
        print("Recording paused")

cap.release()
cv.destroyAllWindows()

print("Done collecting.")
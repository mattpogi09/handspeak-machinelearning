import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split

from utils import normalize_frame_landmarks

# ================= SETTINGS ================= #
DATA_DIR = "Data"
SEQUENCE_LENGTH = 30
INPUT_SIZE = 126
HIDDEN_SIZE = 128
NUM_CLASSES = 25
BATCH_SIZE = 16
EPOCHS = 80
LEARNING_RATE = 0.001
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# ============================================ #

label_map = {
    "Nothing": 0,
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
    'H': 8,
    "I": 9,
    'K': 10,
    'L': 11,
    "M": 12,
    "N": 13,
    "O": 14,
    "P": 15,
    "Q": 16,
    "R": 17,
    "S": 18,
    "T": 19,
    "U": 20,
    "V": 21,
    "W": 22,
    "X": 23,
    "Y": 24
    # "A-Left": 1,
    # "A-Right": 2,
    # "B-Left": 3,
    # "B-Right": 4,
    # "C-Left": 5,
    # "C-Right": 6,
    # "D-Left": 7,
    # "D-Right": 8,
    # "E-Left": 9,
    # "E-Right": 10,
    # "F-Left": 11,
    # "F-Right": 12,
}

# Right only
# label_map = {
#     "Nothing": 0,
#     "A-Right": 1,
#     "B-Right": 2,
#     "C-Right": 3,
#     "D-Right": 4,
#     "E-Right": 5,
#     "F-Right": 6,
# }

# Left Only
# label_map = {
#     "Nothing": 0,
#     "A-Left": 1,
#     "B-Left": 2,
#     "C-Left": 3,
#     "D-Left": 4,
#     "E-Left": 5,
#     "F-Left": 6
# }

# ---------------- Dataset ---------------- #
class GestureDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.long)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def load_data():
    X = []
    y = []

    for label in label_map:
        folder = os.path.join(DATA_DIR, label)
        if not os.path.exists(folder):
            continue

        for file in os.listdir(folder):
            if file.endswith(".npy"):
                data = np.load(os.path.join(folder, file))
                if data.shape == (SEQUENCE_LENGTH, INPUT_SIZE):
                    normalized = np.array(
                        [normalize_frame_landmarks(data[i]) for i in range(SEQUENCE_LENGTH)],
                        dtype=np.float32,
                    )
                    X.append(normalized)
                    y.append(label_map[label])

    return np.array(X), np.array(y)


# ---------------- Model ---------------- #
class LSTMClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(INPUT_SIZE, HIDDEN_SIZE, batch_first=True)
        self.fc = nn.Linear(HIDDEN_SIZE, NUM_CLASSES)

    def forward(self, x):
        _, (hidden, _) = self.lstm(x)
        out = self.fc(hidden[-1])
        return out


# ---------------- Training ---------------- #
def train():
    X, y = load_data()

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    train_loader = DataLoader(GestureDataset(X_train, y_train), batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(GestureDataset(X_val, y_val), batch_size=BATCH_SIZE)

    model = LSTMClassifier().to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        model.eval()
        correct = 0
        total = 0

        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                outputs = model(inputs)
                _, predicted = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        acc = 100 * correct / total

        print(f"Epoch {epoch+1}/{EPOCHS} | Loss: {total_loss:.4f} | Val Acc: {acc:.2f}%")

    torch.save(model.state_dict(), "best_model.pt")
    print("Training complete. Model saved as best_model.pt")


if __name__ == "__main__":
    train()
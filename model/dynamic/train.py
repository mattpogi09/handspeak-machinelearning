"""
train.py
--------
Loads preprocessed .npy keypoints (from processing.py), trains a
Transformer encoder on all 250 ASL signs, evaluates it, and saves weights.
The dataset is indexed lazily so the full 94k-sequence corpus does not need
to live in RAM during training.
On first run, each 30-frame sample is packed into a single cached .npy file so
future epochs do one file read per sequence instead of 30.

Stack: Python 3.14 | PyTorch | CUDA | Transformer (not LSTM)

Feature vector: 1629-dim
    face       468 × 3 = 1404
    pose        33 × 3 =   99
    left_hand   21 × 3 =   63
    right_hand  21 × 3 =   63

Caching:
    First run builds a lightweight manifest of sequence paths and saves it.
    Every run after that loads the manifest quickly — no giant in-memory cache.
    Cache auto-invalidates if your ACTIONS list or sequence length changes.

Usage:
    python train.py

Prerequisites:
    Run processing.py first to populate sign_language_detection/MP_Data/.
"""

import os
import json
import math
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from sklearn.metrics import confusion_matrix, accuracy_score
import pandas as pd
from signs import SIGNS, BUNDLES, ALL_SIGNS, make_selection
from asl_model import ASLFeatureExtractor

# ╔══════════════════════════════════════════════════════════════════╗
# ║                        ✏️  YOUR SETTINGS                        ║
# ╠══════════════════════════════════════════════════════════════════╣
# ║  USE_ALL_SIGNS = True   → train on every sign in ALL_SIGNS      ║
# ║  USE_ALL_SIGNS = False  → train only on CUSTOM_SIGNS below      ║
# ╚══════════════════════════════════════════════════════════════════╝

USE_ALL_SIGNS = True   # train the full 250-sign dataset by default

CUSTOM_SIGNS = [
    "hello",
    "thankyou",
    "yes",
    "no",
    "happy",
]

# ─────────────────────────────────────────────────────────────────────────────
ACTIONS = ALL_SIGNS if USE_ALL_SIGNS else CUSTOM_SIGNS
# ─────────────────────────────────────────────────────────────────────────────

# ── CONFIG ────────────────────────────────────────────────────────────────────
BASE_DIR        = "sign_language_detection"
DATA_PATH       = os.path.join(BASE_DIR, "MP_Data")
MODEL_SAVE_PATH = os.path.join(BASE_DIR, "my_model.pt")
EMBEDDING_SAVE_PATH = os.path.join(BASE_DIR, "my_model_encoder.pt")
LABEL_MAP_PATH  = os.path.join(BASE_DIR, "label_map.json")
PACKED_DATA_PATH = os.path.join(BASE_DIR, "Packed_Data")
PACKED_INDEX_PATH = os.path.join(BASE_DIR, "packed_index.pt")
LOG_DIR         = os.path.join(BASE_DIR, "Logs")

SEQUENCE_LENGTH = 30
FEAT_DIM        = 1629
EPOCHS          = 50
BATCH_SIZE      = 8
GRAD_ACCUM_STEPS = 4
TEST_SPLIT      = 0.15
LEARNING_RATE   = 1e-4
WARMUP_STEPS    = 100
PATIENCE        = 20

# ── Transformer hyperparams ───────────────────────────────────────────────────
D_MODEL       = 96
N_HEADS       = 4
D_FF          = 192
N_LAYERS      = 3
DROPOUT       = 0.1
EMBEDDING_DIM = 96

# ── DataLoader workers run on CPU, not GPU. On a 12-thread CPU, 8 is a
# ── reasonable starting point for packed sequences on Windows.
NUM_WORKERS = 8

# ── Hand normalisation ────────────────────────────────────────────────────────
HAND_LM        = 21
WRIST_IDX      = 0
MIDDLE_MCP_IDX = 9
EPS            = 1e-6

FACE_DIM = 468 * 3
POSE_DIM =  33 * 3
HAND_DIM =  21 * 3
POSE_END = FACE_DIM + POSE_DIM
LH_END   = POSE_END + HAND_DIM
RH_END   = LH_END   + HAND_DIM


def normalize_hand(hand_array: np.ndarray) -> np.ndarray:
    if np.all(hand_array == 0):
        return hand_array
    pts    = hand_array.reshape(HAND_LM, 3)
    center = pts[WRIST_IDX].copy()
    pts_c  = pts - center
    scale  = np.linalg.norm(pts_c[MIDDLE_MCP_IDX])
    if scale < EPS:
        scale = 1.0
    return (pts_c / scale).ravel()


def ensure_normalized(kp: np.ndarray) -> np.ndarray:
    out = kp.copy()
    out[POSE_END:LH_END] = normalize_hand(kp[POSE_END:LH_END])
    out[LH_END:RH_END]   = normalize_hand(kp[LH_END:RH_END])
    return out


def _load_raw_sequence(seq_path: str) -> np.ndarray:
    sequence = np.empty((SEQUENCE_LENGTH, FEAT_DIM), dtype=np.float32)
    for frame_num in range(SEQUENCE_LENGTH):
        frame_path = os.path.join(seq_path, f"{frame_num}.npy")
        sequence[frame_num] = ensure_normalized(
            np.load(frame_path, allow_pickle=False)
        )
    return sequence


def _packed_sequence_path(sign: str, seq_dir: str) -> str:
    return os.path.join(PACKED_DATA_PATH, sign, f"{seq_dir}.npy")


def _pack_sequence(raw_seq_path: str, packed_path: str) -> None:
    os.makedirs(os.path.dirname(packed_path), exist_ok=True)
    sequence = _load_raw_sequence(raw_seq_path)
    np.save(packed_path, sequence)


# ── Dataset ───────────────────────────────────────────────────────────────────

class SignDataset(Dataset):
    def __init__(self, actions: list[str], data_path: str,
                 label_map: dict[str, int]):
        self.samples: list[tuple[str, int]] = []

        for sign in actions:
            sign_path = os.path.join(data_path, sign)
            if not os.path.isdir(sign_path):
                print(f"⚠  Missing folder: {sign_path}  — run processing.py")
                continue

            seq_dirs = sorted(
                [d for d in os.listdir(sign_path) if d.isdigit()], key=int
            )
            loaded = 0
            for seq_dir in seq_dirs:
                seq_path = os.path.join(sign_path, seq_dir)
                packed_path = _packed_sequence_path(sign, seq_dir)
                if not os.path.exists(packed_path):
                    _pack_sequence(seq_path, packed_path)
                self.samples.append((packed_path, label_map[sign]))
                loaded += 1

            print(f"  {sign:<20}: {loaded} sequences")

        print(f"\n✅ Packed dataset index — {len(self.samples)} total sequences")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        packed_path, label = self.samples[idx]
        x = torch.from_numpy(np.load(packed_path, allow_pickle=False).copy())
        y = torch.tensor(label, dtype=torch.long)
        return x, y


# ── Warmup + Cosine LR ───────────────────────────────────────────────────────

class WarmupCosineScheduler(optim.lr_scheduler.LambdaLR):
    def __init__(self, optimizer, warmup_steps: int, total_steps: int):
        def lr_lambda(step: int) -> float:
            if step < warmup_steps:
                return step / max(1, warmup_steps)
            progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
            return max(0.0, 0.5 * (1.0 + math.cos(math.pi * progress)))
        super().__init__(optimizer, lr_lambda)


# ── Train / Val loops ─────────────────────────────────────────────────────────

def train_one_epoch(model, loader, optimizer, scheduler, criterion,
                    device, scaler, grad_accum_steps: int) -> float:
    model.train()
    total_loss = 0.0
    total      = 0

    optimizer.zero_grad(set_to_none=True)

    for step, (x, y) in enumerate(loader, start=1):
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True)

        with torch.autocast(device_type=device.type, dtype=torch.float16,
                             enabled=device.type == "cuda"):
            logits = model(x)
            loss   = criterion(logits, y) / grad_accum_steps

        scaler.scale(loss).backward()
        should_step = (step % grad_accum_steps == 0) or (step == len(loader))
        if should_step:
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad(set_to_none=True)
            scheduler.step()

        total_loss += loss.item() * x.size(0) * grad_accum_steps
        total      += x.size(0)

    return total_loss / total


def val_one_epoch(model, loader, criterion, device) -> tuple[float, float]:
    model.eval()
    total_loss = 0.0
    correct    = 0
    total      = 0

    with torch.no_grad():
        for x, y in loader:
            x, y   = x.to(device), y.to(device)
            logits = model(x)
            loss   = criterion(logits, y)
            total_loss += loss.item() * x.size(0)
            correct    += (logits.argmax(1) == y).sum().item()
            total      += x.size(0)

    return total_loss / total, correct / total


def evaluate(model, loader, device, num_classes):
    model.eval()
    y_true_all: list[int] = []
    y_pred_all: list[int] = []

    with torch.no_grad():
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            preds = model(x).argmax(dim=1)
            y_true_all.extend(y.cpu().tolist())
            y_pred_all.extend(preds.cpu().tolist())

    acc    = accuracy_score(y_true_all, y_pred_all)
    cm     = confusion_matrix(y_true_all, y_pred_all,
                               labels=list(range(num_classes)))
    labels = [ACTIONS[i] if i < len(ACTIONS) else str(i)
              for i in range(num_classes)]
    print(f"\n{'─'*50}")
    print("  Confusion Matrix:")
    print(pd.DataFrame(cm, index=labels, columns=labels).to_string())
    print(f"\n🎯 Accuracy: {acc:.4f}  ({acc * 100:.2f}%)")
    print(f"{'─'*50}\n")
    return acc


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    mode   = "ALL 250 signs" if USE_ALL_SIGNS else f"{len(ACTIONS)} custom signs"
    print(f"\n═══ train.py  ({mode}) ═══")
    print(f"  Device  : {device}")
    print(f"  Signs   : {'ALL (' + str(len(ACTIONS)) + ')' if USE_ALL_SIGNS else ACTIONS}")
    if device.type == "cuda":
        props = torch.cuda.get_device_properties(0)
        print(f"  GPU     : {props.name}")
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32       = True
        torch.backends.cudnn.benchmark        = True
    print(f"  Workers : {NUM_WORKERS}\n")

    label_map = {sign: idx for idx, sign in enumerate(ACTIONS)}
    os.makedirs(BASE_DIR, exist_ok=True)
    with open(LABEL_MAP_PATH, "w") as f:
        json.dump(label_map, f, indent=2)
    print(f"✅ Label map saved → {LABEL_MAP_PATH}")

    # ── Dataset: load from cache or build from .npy files ────────────────────
    # Cache auto-invalidates if ACTIONS changes — safe to leave as is.
    cache_valid = False
    if os.path.exists(PACKED_INDEX_PATH):
        print(f"\n⚡ Cache found — loading from {PACKED_INDEX_PATH} ...")
        cache = torch.load(PACKED_INDEX_PATH, weights_only=False)
        if cache.get("actions") == ACTIONS and cache.get("seq_len") == SEQUENCE_LENGTH:
            full_dataset = SignDataset.__new__(SignDataset)
            full_dataset.samples = cache["samples"]
            print(f"✅ Loaded {len(full_dataset)} packed sequence paths instantly")
            cache_valid = True
        else:
            print("⚠  Cache is for different signs — rebuilding ...")

    if not cache_valid:
        print("\n📂 No cache / signs changed — packing sequences from .npy files (hang tight) ...")
        os.makedirs(PACKED_DATA_PATH, exist_ok=True)
        full_dataset = SignDataset(ACTIONS, DATA_PATH, label_map)
        print(f"\n💾 Saving cache → {PACKED_INDEX_PATH} ...")
        torch.save({
            "samples": full_dataset.samples,
            "actions": ACTIONS,
            "seq_len": SEQUENCE_LENGTH,
        }, PACKED_INDEX_PATH)
        print(f"✅ Cache saved — next run will be much faster")

    n_total = len(full_dataset)
    n_test  = max(1, int(n_total * TEST_SPLIT))
    n_train = n_total - n_test
    train_ds, test_ds = random_split(
        full_dataset, [n_train, n_test],
        generator=torch.Generator().manual_seed(42)
    )
    print(f"\nTrain: {len(train_ds)}  |  Test: {len(test_ds)}")

    pin = device.type == "cuda"
    loader_kwargs = dict(
        num_workers=NUM_WORKERS,
        pin_memory=pin,
        persistent_workers=NUM_WORKERS > 0,
    )
    if NUM_WORKERS > 0:
        loader_kwargs["prefetch_factor"] = 2

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                              **loader_kwargs)
    test_loader  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False,
                              **loader_kwargs)

    model     = ASLFeatureExtractor(
        FEAT_DIM,
        len(ACTIONS),
        d_model=D_MODEL,
        n_heads=N_HEADS,
        n_layers=N_LAYERS,
        d_ff=D_FF,
        dropout=DROPOUT,
        embedding_dim=EMBEDDING_DIM,
    ).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)

    steps_per_epoch = math.ceil(len(train_loader) / GRAD_ACCUM_STEPS)
    total_steps = steps_per_epoch * EPOCHS
    scheduler   = WarmupCosineScheduler(optimizer, WARMUP_STEPS, total_steps)
    scaler      = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")

    n_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\n  Model   : ASLFeatureExtractor")
    print(f"  d_model={D_MODEL}  heads={N_HEADS}  layers={N_LAYERS}  d_ff={D_FF}")
    print(f"  embed   : {EMBEDDING_DIM}")
    print(f"  Params  : {n_params:,}\n")

    best_val_acc = 0.0
    no_improve   = 0
    log_rows: list[dict] = []

    print("🚀 Training …\n")
    for epoch in range(1, EPOCHS + 1):
        train_loss        = train_one_epoch(
            model, train_loader, optimizer, scheduler, criterion, device, scaler,
            GRAD_ACCUM_STEPS,
        )
        val_loss, val_acc = val_one_epoch(model, test_loader, criterion, device)
        lr_now = optimizer.param_groups[0]["lr"]

        print(
            f"  Epoch {epoch:3d}/{EPOCHS}  "
            f"train_loss={train_loss:.4f}  "
            f"val_loss={val_loss:.4f}  "
            f"val_acc={val_acc:.4f}  "
            f"lr={lr_now:.2e}"
        )
        log_rows.append({"epoch": epoch, "train_loss": train_loss,
                          "val_loss": val_loss, "val_acc": val_acc, "lr": lr_now})

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                "epoch": epoch, "model_state": model.state_dict(),
                "optimizer": optimizer.state_dict(), "val_acc": val_acc,
                "actions": ACTIONS, "label_map": label_map,
                "feat_dim": FEAT_DIM, "seq_len": SEQUENCE_LENGTH,
                "arch": "asl_feature_extractor",
                "d_model": D_MODEL, "n_heads": N_HEADS,
                "n_layers": N_LAYERS, "d_ff": D_FF,
                "embedding_dim": EMBEDDING_DIM,
                "dropout": DROPOUT,
            }, MODEL_SAVE_PATH)
            print(f"    💾 New best ({best_val_acc:.4f}) → {MODEL_SAVE_PATH}")
            torch.save({
                "model_state": model.state_dict(),
                "actions": ACTIONS,
                "label_map": label_map,
                "feat_dim": FEAT_DIM,
                "seq_len": SEQUENCE_LENGTH,
                "arch": "asl_feature_extractor",
                "d_model": D_MODEL,
                "n_heads": N_HEADS,
                "n_layers": N_LAYERS,
                "d_ff": D_FF,
                "embedding_dim": EMBEDDING_DIM,
                "dropout": DROPOUT,
            }, EMBEDDING_SAVE_PATH)
            print(f"    🧩 Encoder export → {EMBEDDING_SAVE_PATH}")
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= PATIENCE:
                print(f"\n  Early stopping at epoch {epoch}.")
                break

    os.makedirs(LOG_DIR, exist_ok=True)
    log_path = os.path.join(LOG_DIR, "training_log.csv")
    pd.DataFrame(log_rows).to_csv(log_path, index=False)
    print(f"\n📋 Log → {log_path}")

    print("\n📊 Evaluating best checkpoint …")
    model.load_state_dict(
        torch.load(MODEL_SAVE_PATH, map_location=device)["model_state"]
    )
    evaluate(model, test_loader, device, len(ACTIONS))

    print(f"✅ Best val accuracy : {best_val_acc:.4f}  ({best_val_acc * 100:.2f}%)\n")


if __name__ == "__main__":
    main()
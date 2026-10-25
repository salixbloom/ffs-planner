#!/usr/bin/env python3
"""
Convert the MediaPipe->FLAME landmark embedding into JSON for the browser.

Source: https://github.com/georgeretsi/smirk (MIT, Copyright (c) 2024 George
Retsinas), assets/mediapipe_landmark_embedding/mediapipe_landmark_embedding.npz

The embedding places 105 MediaPipe landmarks on FLAME's surface as barycentric
points: a triangle index plus three weights. It is small enough that JSON costs
nothing and stays inspectable.

Usage:
    python tools/prepare-embedding.py path/to/mediapipe_landmark_embedding.npz

Writes flame/mediapipe-embedding.json.
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np

FLAME_FACES = 9976
MEDIAPIPE_LANDMARKS = 478


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("embedding", type=Path, help="mediapipe_landmark_embedding.npz")
    parser.add_argument("--out", type=Path, default=Path("flame/mediapipe-embedding.json"))
    args = parser.parse_args()

    data = np.load(args.embedding, allow_pickle=True)
    face_idx = np.asarray(data["lmk_face_idx"]).astype(np.int64).ravel()
    b_coords = np.asarray(data["lmk_b_coords"]).astype(np.float64).reshape(len(face_idx), 3)
    mp_idx = np.asarray(data["landmark_indices"]).astype(np.int64).ravel()

    # These invariants are what make the embedding safe to trust downstream.
    if not (len(face_idx) == len(b_coords) == len(mp_idx)):
        raise SystemExit("embedding arrays disagree on length")
    if face_idx.min() < 0 or face_idx.max() >= FLAME_FACES:
        raise SystemExit(f"triangle index out of range: {face_idx.min()}..{face_idx.max()}")
    if mp_idx.min() < 0 or mp_idx.max() >= MEDIAPIPE_LANDMARKS:
        raise SystemExit(f"landmark index out of range: {mp_idx.min()}..{mp_idx.max()}")
    if not np.allclose(b_coords.sum(axis=1), 1.0, atol=1e-4):
        raise SystemExit("barycentric weights do not sum to 1")
    if b_coords.min() < -1e-6:
        raise SystemExit("negative barycentric weight")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({
        "source": "SMIRK (github.com/georgeretsi/smirk), MIT, Copyright (c) 2024 George Retsinas",
        "describes": "barycentric placement of MediaPipe landmarks on the FLAME surface",
        "count": int(len(face_idx)),
        "landmarkIndices": [int(i) for i in mp_idx],
        "triangleIndices": [int(i) for i in face_idx],
        "barycentric": [[round(float(w), 8) for w in row] for row in b_coords],
    }, indent=1) + "\n", encoding="utf-8")

    print(f"landmarks {len(face_idx)}")
    print(f"wrote     {args.out} ({args.out.stat().st_size / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

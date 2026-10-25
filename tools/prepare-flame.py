#!/usr/bin/env python3
"""
Convert the FLAME 2023 model into the compact basis the browser loads.

The published model is a 53 MB pickle of float64 arrays, 91% of which is a
shape basis we only partly need: of its 400 components the last 100 are
expression (`expr_components = last_100` in the model's own metadata), and the
first 300 are identity. Shipping the leading identity components as float32
brings this to roughly 6 MB, comparable to the MediaPipe model already loaded.

Usage:
    python tools/prepare-flame.py ~/Downloads/FLAME2023Open.zip
    python tools/prepare-flame.py path/to/flame2023_Open.pkl

Writes flame/flame-shape.bin and flame/flame-shape.json.

The output is a modified excerpt of the FLAME 2023 model, which is licensed
CC-BY 4.0; CC-BY requires both attribution and a statement that changes were
made. See the README.
"""

import argparse
import io
import json
import pickle
import sys
import zipfile
from pathlib import Path

import numpy as np

# Of the 400 shapedirs components the first 300 are identity; the rest are
# expression, which nothing uses yet.
IDENTITY_COMPONENTS = 300
DEFAULT_KEEP = 100
PKL_NAME = "flame2023_Open.pkl"


class _Opaque:
    """Absorbs chumpy/scipy objects so the pickle loads without those packages."""

    def __init__(self, *args, **kwargs):
        pass

    def __setstate__(self, state):
        pass

    def __reduce__(self):
        return (_Opaque, ())


class _Unpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module.startswith(("chumpy", "scipy")):
            return _Opaque
        return super().find_class(module, name)


def load_model(path: Path) -> dict:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            try:
                raw = archive.read(PKL_NAME)
            except KeyError:
                names = [n for n in archive.namelist() if n.endswith(".pkl")]
                if len(names) != 1:
                    raise SystemExit(f"expected one .pkl in {path}, found {names}")
                raw = archive.read(names[0])
        return _Unpickler(io.BytesIO(raw), encoding="latin1").load()

    with open(path, "rb") as handle:
        return _Unpickler(handle, encoding="latin1").load()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path, help="FLAME2023Open.zip or flame2023_Open.pkl")
    parser.add_argument("--components", type=int, default=DEFAULT_KEEP,
                        help=f"identity components to keep (default {DEFAULT_KEEP})")
    parser.add_argument("--out", type=Path, default=Path("flame"),
                        help="output directory (default flame/)")
    args = parser.parse_args()

    if not args.model.exists():
        raise SystemExit(f"no such file: {args.model}")
    if not 1 <= args.components <= IDENTITY_COMPONENTS:
        raise SystemExit(f"--components must be 1..{IDENTITY_COMPONENTS}")

    model = load_model(args.model)

    template = np.asarray(model["v_template"], dtype=np.float64)
    shapedirs = np.asarray(model["shapedirs"], dtype=np.float64)
    faces = np.asarray(model["f"], dtype=np.int64)

    vertices, _, total_components = shapedirs.shape
    metadata = model.get("supr_expression_metadata") or {}
    expression_count = int(metadata.get("n_expr", total_components - IDENTITY_COMPONENTS))

    # Guard the assumption the truncation depends on: taking the wrong slice
    # would quietly ship expression blendshapes as if they were identity.
    if metadata.get("expr_components") not in (None, "last_100"):
        raise SystemExit(f"unexpected expression layout: {metadata.get('expr_components')}")
    if total_components - expression_count != IDENTITY_COMPONENTS:
        raise SystemExit(
            f"expected {IDENTITY_COMPONENTS} identity components, "
            f"found {total_components - expression_count}"
        )
    if faces.max() >= vertices:
        raise SystemExit("face index out of range")

    identity = shapedirs[:, :, : args.components]

    args.out.mkdir(parents=True, exist_ok=True)
    binary = args.out / "flame-shape.bin"
    header = args.out / "flame-shape.json"

    # Written back to back, float32 then uint16, in the order the loader reads.
    with open(binary, "wb") as out:
        out.write(template.astype(np.float32).tobytes())
        out.write(np.ascontiguousarray(identity, dtype=np.float32).tobytes())
        out.write(faces.astype(np.uint16).tobytes())

    extent = (template.max(axis=0) - template.min(axis=0)).tolist()
    header.write_text(json.dumps({
        "source": "FLAME 2023 (flame2023_Open.pkl), CC-BY 4.0",
        "modified": (
            f"identity components truncated from {IDENTITY_COMPONENTS} to {args.components}; "
            f"expression components ({expression_count}) and pose correctives dropped; "
            "float64 converted to float32; face indices converted to uint16"
        ),
        "vertices": int(vertices),
        "faces": int(faces.shape[0]),
        "components": int(args.components),
        "units": "metres",
        "templateExtent": [round(v, 4) for v in extent],
        "layout": [
            {"name": "template", "type": "float32", "shape": [int(vertices), 3]},
            {"name": "shapeBasis", "type": "float32", "shape": [int(vertices), 3, args.components]},
            {"name": "faces", "type": "uint16", "shape": [int(faces.shape[0]), 3]},
        ],
    }, indent=2) + "\n", encoding="utf-8")

    print(f"vertices        {vertices}")
    print(f"faces           {faces.shape[0]}")
    print(f"components      {args.components} of {IDENTITY_COMPONENTS} identity "
          f"({expression_count} expression dropped)")
    print(f"template extent {[round(v, 3) for v in extent]} m")
    print(f"wrote           {binary} ({binary.stat().st_size / 1e6:.2f} MB)")
    print(f"wrote           {header}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Clamp YOLO label coordinates into the valid [0, 1] range."""

from __future__ import annotations

import argparse
from pathlib import Path


def fix_file(label_path: Path) -> int:
    changed = 0
    fixed_lines = []
    for line in label_path.read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) != 5:
            fixed_lines.append(line)
            continue
        try:
            class_id = int(float(parts[0]))
            coords = [float(v) for v in parts[1:]]
        except ValueError:
            fixed_lines.append(line)
            continue
        fixed = [max(0.0, min(1.0, value)) for value in coords]
        if fixed != coords:
            changed += 1
        fixed_lines.append(f"{class_id} " + " ".join(f"{value:.6f}" for value in fixed))
    label_path.write_text("\n".join(fixed_lines), encoding="utf-8")
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description="Fix out-of-range YOLO bbox coordinates")
    parser.add_argument("dataset", nargs="?", default="datasets/rsod/yolo_dataset")
    args = parser.parse_args()

    total = 0
    for label_path in Path(args.dataset).glob("labels/**/*.txt"):
        total += fix_file(label_path)
    print(f"Fixed {total} label rows")


if __name__ == "__main__":
    main()

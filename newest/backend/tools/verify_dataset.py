"""Verify a YOLO dataset directory before training."""

from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def load_yaml_classes(dataset_dir: Path) -> dict[int, str]:
    yaml_path = dataset_dir / "data.yaml"
    if not yaml_path.exists():
        return {}

    classes: dict[int, str] = {}
    in_names = False
    for raw_line in yaml_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith("names:"):
            in_names = True
            continue
        if in_names:
            if not line or not line[0].isdigit():
                if line and not line.startswith("#"):
                    break
                continue
            key, value = line.split(":", 1)
            classes[int(key.strip())] = value.strip().strip("'\"")
    return classes


def verify_dataset(dataset_dir: str) -> dict:
    dataset_path = Path(dataset_dir)
    classes = load_yaml_classes(dataset_path)
    results = {
        "dataset_dir": str(dataset_path),
        "classes": classes,
        "splits": {},
        "warnings": [],
        "errors": [],
        "class_distribution": Counter(),
    }

    if not dataset_path.exists():
        results["errors"].append(f"dataset directory does not exist: {dataset_path}")
        results["ok"] = False
        return results
    if not (dataset_path / "data.yaml").exists():
        results["warnings"].append("data.yaml not found")

    for split in ["train", "val", "test"]:
        img_dir = dataset_path / "images" / split
        lbl_dir = dataset_path / "labels" / split
        images = sorted(f for f in img_dir.glob("*") if f.suffix.lower() in IMAGE_EXTENSIONS) if img_dir.exists() else []
        labels = sorted(lbl_dir.glob("*.txt")) if lbl_dir.exists() else []
        split_stats = {"images": len(images), "labels": len(labels), "objects": 0, "bad_labels": []}

        if split in ["train", "val"] and not images:
            results["warnings"].append(f"{split} split has no images")

        for image in images:
            label_path = lbl_dir / f"{image.stem}.txt"
            if not label_path.exists():
                results["warnings"].append(f"missing label for {split}/{image.name}")

        for label in labels:
            for line_no, line in enumerate(label.read_text(encoding="utf-8").splitlines(), start=1):
                if not line.strip():
                    continue
                parts = line.split()
                if len(parts) != 5:
                    split_stats["bad_labels"].append(f"{label.name}:{line_no} expected 5 fields")
                    continue
                try:
                    class_id = int(float(parts[0]))
                    coords = [float(v) for v in parts[1:]]
                except ValueError:
                    split_stats["bad_labels"].append(f"{label.name}:{line_no} non-numeric value")
                    continue
                if any(v < 0 or v > 1 for v in coords):
                    split_stats["bad_labels"].append(f"{label.name}:{line_no} coordinate outside [0,1]")
                if classes and class_id not in classes:
                    split_stats["bad_labels"].append(f"{label.name}:{line_no} class id {class_id} not in data.yaml")
                results["class_distribution"][class_id] += 1
                split_stats["objects"] += 1

        if split_stats["bad_labels"]:
            results["errors"].extend(f"{split}: {item}" for item in split_stats["bad_labels"])
        results["splits"][split] = split_stats

    results["class_distribution"] = dict(results["class_distribution"])
    results["ok"] = not results["errors"]
    return results


def print_report(results: dict) -> None:
    print("YOLO dataset verification report")
    print(f"Dataset: {results['dataset_dir']}")
    print(f"Classes: {results.get('classes') or 'not found'}")
    for split, item in results.get("splits", {}).items():
        print(f"{split}: {item['images']} images, {item['labels']} labels, {item['objects']} objects")
    for warning in results.get("warnings", []):
        print(f"[warning] {warning}")
    for error in results.get("errors", []):
        print(f"[error] {error}")
    print("Result:", "OK" if results.get("ok") else "FAILED")


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify YOLO dataset structure and labels")
    parser.add_argument("dataset", nargs="?", default="datasets/rsod/yolo_dataset")
    args = parser.parse_args()
    print_report(verify_dataset(args.dataset))


if __name__ == "__main__":
    main()

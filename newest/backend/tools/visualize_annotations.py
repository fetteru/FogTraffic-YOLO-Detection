"""Visualize YOLO annotations on sampled dataset images."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import cv2

from tools.verify_dataset import IMAGE_EXTENSIONS, load_yaml_classes


def draw_image(image_path: Path, label_path: Path, class_names: dict[int, str], output_path: Path) -> None:
    image = cv2.imread(str(image_path))
    if image is None:
        return
    height, width = image.shape[:2]
    if label_path.exists():
        for line in label_path.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) != 5:
                continue
            class_id = int(float(parts[0]))
            x_center, y_center, box_w, box_h = [float(v) for v in parts[1:]]
            x1 = int((x_center - box_w / 2) * width)
            y1 = int((y_center - box_h / 2) * height)
            x2 = int((x_center + box_w / 2) * width)
            y2 = int((y_center + box_h / 2) * height)
            cv2.rectangle(image, (x1, y1), (x2, y2), (64, 158, 255), 2)
            cv2.putText(
                image,
                class_names.get(class_id, str(class_id)),
                (x1, max(16, y1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (64, 158, 255),
                2,
            )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), image)


def collect_pairs(dataset_dir: Path, splits: list[str]) -> list[tuple[Path, Path, str]]:
    pairs = []
    for split in splits:
        image_dir = dataset_dir / "images" / split
        label_dir = dataset_dir / "labels" / split
        if not image_dir.exists():
            continue
        for image_path in image_dir.iterdir():
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                pairs.append((image_path, label_dir / f"{image_path.stem}.txt", split))
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description="Visualize YOLO annotations")
    parser.add_argument("--dataset", "-d", default="datasets/rsod/yolo_dataset")
    parser.add_argument("--output", "-o", default="datasets/rsod/vis_output")
    parser.add_argument("--count", "-c", type=int, default=10)
    parser.add_argument("--splits", nargs="+", default=["train", "val"])
    parser.add_argument("--image", help="Single image relative path, such as train/000001.jpg")
    args = parser.parse_args()

    dataset_dir = Path(args.dataset)
    output_dir = Path(args.output)
    class_names = load_yaml_classes(dataset_dir)

    if args.image:
        split, filename = args.image.replace("\\", "/").split("/", 1)
        image_path = dataset_dir / "images" / split / filename
        label_path = dataset_dir / "labels" / split / f"{Path(filename).stem}.txt"
        draw_image(image_path, label_path, class_names, output_dir / f"vis_{Path(filename).name}")
        print(f"Saved visualization to {output_dir}")
        return

    pairs = collect_pairs(dataset_dir, args.splits)
    sample = random.sample(pairs, min(args.count, len(pairs))) if pairs else []
    for image_path, label_path, split in sample:
        draw_image(image_path, label_path, class_names, output_dir / split / image_path.name)
    print(f"Saved {len(sample)} visualizations to {output_dir}")


if __name__ == "__main__":
    main()

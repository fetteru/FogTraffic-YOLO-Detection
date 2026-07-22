"""Convert COCO JSON annotations to a YOLO dataset."""

from __future__ import annotations

import argparse
from pathlib import Path

from app.training.data_converter import DataConverter
from app.training.dataset_splitter import DatasetSplitter


DEFAULT_CLASSES = ["aircraft", "oiltank", "overpass", "playground"]


def main() -> None:
    parser = argparse.ArgumentParser(description="COCO JSON to YOLO dataset converter")
    parser.add_argument("--json", default="datasets/rsod/raw/annotations/instances_train.json")
    parser.add_argument("--images", default="datasets/rsod/raw/images")
    parser.add_argument("--output", default="datasets/rsod/yolo_dataset")
    parser.add_argument("--classes", nargs="+", default=DEFAULT_CLASSES)
    args = parser.parse_args()

    output_dir = Path(args.output)
    temp_labels = output_dir / "_temp_labels"
    class_mapping = {name: idx for idx, name in enumerate(args.classes)}

    stats = DataConverter.coco_to_yolo(args.json, str(temp_labels), class_mapping)
    split_stats = DatasetSplitter.organize_dataset(args.images, str(temp_labels), str(output_dir))
    yaml_path = DatasetSplitter.generate_data_yaml(str(output_dir), args.classes)

    print(f"COCO converted: {stats}")
    print(f"Dataset split: {split_stats}")
    print(f"data.yaml: {yaml_path}")


if __name__ == "__main__":
    main()

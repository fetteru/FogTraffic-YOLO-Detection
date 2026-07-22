"""Dataset split and YOLO directory organization helpers."""

from __future__ import annotations

import os
import random
import shutil
from pathlib import Path

from app.core.logger import get_logger


logger = get_logger(__name__)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


class DatasetSplitter:
    """Organize images and labels into a YOLO train/val/test structure."""

    @staticmethod
    def organize_dataset(
        image_dir: str,
        label_dir: str,
        output_dir: str,
        train_ratio: float = 0.8,
        val_ratio: float = 0.1,
        test_ratio: float = 0.1,
        seed: int = 42,
    ) -> dict:
        if abs((train_ratio + val_ratio + test_ratio) - 1.0) > 1e-6:
            raise ValueError("train_ratio + val_ratio + test_ratio must equal 1.0")

        image_dir_path = Path(image_dir)
        if not image_dir_path.exists():
            return {"train": 0, "val": 0, "test": 0, "missing_labels": [], "error": "image_dir not found"}

        subdirs = {d.name for d in image_dir_path.iterdir() if d.is_dir()}
        if {"train", "val", "test"}.issubset(subdirs):
            return DatasetSplitter._organize_from_split_dirs(image_dir, label_dir, output_dir)

        image_files = sorted(f for f in image_dir_path.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS)
        if not image_files:
            return {"train": 0, "val": 0, "test": 0, "missing_labels": [], "error": "no images found"}

        random.Random(seed).shuffle(image_files)
        total = len(image_files)
        train_end = int(total * train_ratio)
        val_end = train_end + int(total * val_ratio)
        splits = {
            "train": image_files[:train_end],
            "val": image_files[train_end:val_end],
            "test": image_files[val_end:],
        }

        stats = {"train": 0, "val": 0, "test": 0, "missing_labels": []}
        for split_name, files in splits.items():
            DatasetSplitter._copy_split(files, Path(label_dir), Path(output_dir), split_name, stats)
        return stats

    @staticmethod
    def _organize_from_split_dirs(image_dir: str, label_dir: str, output_dir: str) -> dict:
        stats = {"train": 0, "val": 0, "test": 0, "missing_labels": []}
        for split_name in ["train", "val", "test"]:
            src_img_dir = Path(image_dir) / split_name
            src_lbl_dir = Path(label_dir) / split_name
            if not src_img_dir.exists():
                logger.warning("Split image directory does not exist: %s", src_img_dir)
                continue
            image_files = sorted(f for f in src_img_dir.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS)
            DatasetSplitter._copy_split(image_files, src_lbl_dir, Path(output_dir), split_name, stats)
        return stats

    @staticmethod
    def _copy_split(files: list[Path], label_dir: Path, output_dir: Path, split_name: str, stats: dict) -> None:
        img_out = output_dir / "images" / split_name
        lbl_out = output_dir / "labels" / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_file in files:
            shutil.copy2(img_file, img_out / img_file.name)
            label_file = label_dir / f"{img_file.stem}.txt"
            if label_file.exists():
                shutil.copy2(label_file, lbl_out / label_file.name)
            else:
                (lbl_out / f"{img_file.stem}.txt").touch()
                stats["missing_labels"].append(img_file.name)
            stats[split_name] += 1

    @staticmethod
    def generate_data_yaml(
        output_dir: str,
        class_names: list[str],
        class_names_cn: list[str] | None = None,
    ) -> str:
        import yaml

        data_config = {
            "path": f"./{os.path.basename(output_dir)}",
            "train": "images/train",
            "val": "images/val",
            "test": "images/test",
            "nc": len(class_names),
            "names": {i: name for i, name in enumerate(class_names)},
        }
        if class_names_cn:
            data_config["names_cn"] = {i: name for i, name in enumerate(class_names_cn)}

        yaml_path = Path(output_dir) / "data.yaml"
        yaml_path.parent.mkdir(parents=True, exist_ok=True)
        with yaml_path.open("w", encoding="utf-8") as f:
            yaml.dump(data_config, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
        logger.info("data.yaml generated: %s", yaml_path)
        return str(yaml_path)

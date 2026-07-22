"""Create an enhanced copy of a YOLO dataset without changing labels."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


DEFAULT_NAMES = ["car", "person", "motorcycle", "bus", "truck", "bicycle", "train"]
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SPLITS = ["train", "val", "valid", "test"]

PRESETS = {
    "light": {
        "autocontrast_cutoff": 0.5,
        "gamma": 0.96,
        "contrast": 1.06,
        "brightness": 1.02,
        "sharpness": 1.08,
        "unsharp_percent": 45,
    },
    "balanced": {
        "autocontrast_cutoff": 1.0,
        "gamma": 0.92,
        "contrast": 1.12,
        "brightness": 1.03,
        "sharpness": 1.15,
        "unsharp_percent": 70,
    },
    "strong": {
        "autocontrast_cutoff": 2.0,
        "gamma": 0.86,
        "contrast": 1.22,
        "brightness": 1.04,
        "sharpness": 1.28,
        "unsharp_percent": 105,
    },
}


def parse_names(value: str | None) -> list[str]:
    if not value:
        return DEFAULT_NAMES
    return [item.strip() for item in value.split(",") if item.strip()]


def image_split_dir(dataset_dir: Path, split: str) -> Path | None:
    for candidate in (dataset_dir / "images" / split, dataset_dir / split / "images"):
        if candidate.exists():
            return candidate
    return None


def label_split_dir(dataset_dir: Path, split: str) -> Path | None:
    for candidate in (dataset_dir / "labels" / split, dataset_dir / split / "labels"):
        if candidate.exists():
            return candidate
    return None


def gamma_correct(image: Image.Image, gamma: float) -> Image.Image:
    if gamma == 1.0:
        return image

    table = [round(((value / 255) ** gamma) * 255) for value in range(256)]
    channels = len(image.getbands())
    return image.point(table * channels)


def enhance_image(image: Image.Image, preset: str) -> Image.Image:
    settings = PRESETS[preset]
    original_mode = image.mode

    enhanced = image.convert("RGB")
    enhanced = ImageOps.autocontrast(enhanced, cutoff=settings["autocontrast_cutoff"])
    enhanced = gamma_correct(enhanced, settings["gamma"])
    enhanced = ImageEnhance.Contrast(enhanced).enhance(settings["contrast"])
    enhanced = ImageEnhance.Brightness(enhanced).enhance(settings["brightness"])
    enhanced = ImageEnhance.Sharpness(enhanced).enhance(settings["sharpness"])
    enhanced = enhanced.filter(
        ImageFilter.UnsharpMask(
            radius=1.2,
            percent=settings["unsharp_percent"],
            threshold=3,
        )
    )

    if original_mode in {"L", "RGBA"}:
        return enhanced.convert(original_mode)
    return enhanced


def write_data_yaml(output_dir: Path, names: list[str]) -> None:
    content = "\n".join(
        [
            f"path: {output_dir.resolve().as_posix()}",
            "train: images/train",
            "val: images/val",
            "test: images/test",
            "",
            f"nc: {len(names)}",
            "names:",
            *[f"  {index}: {name}" for index, name in enumerate(names)],
            "",
        ]
    )
    (output_dir / "data.yaml").write_text(content, encoding="utf-8")


def copy_labels(source_dir: Path, output_dir: Path) -> int:
    copied = 0
    for split in SPLITS:
        label_dir = label_split_dir(source_dir, split)
        if not label_dir:
            continue

        output_label_dir = output_dir / "labels" / ("val" if split == "valid" else split)
        output_label_dir.mkdir(parents=True, exist_ok=True)
        for label_path in sorted(label_dir.glob("*.txt")):
            shutil.copy2(label_path, output_label_dir / label_path.name)
            copied += 1
    return copied


def enhance_dataset(source_dir: Path, output_dir: Path, preset: str, names: list[str], overwrite: bool) -> None:
    if output_dir.exists():
        if not overwrite:
            raise FileExistsError(f"{output_dir} already exists. Use --overwrite to replace it.")
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    image_count = 0
    for split in SPLITS:
        input_image_dir = image_split_dir(source_dir, split)
        if not input_image_dir:
            continue

        output_split = "val" if split == "valid" else split
        output_image_dir = output_dir / "images" / output_split
        output_image_dir.mkdir(parents=True, exist_ok=True)

        for image_path in sorted(input_image_dir.iterdir()):
            if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            output_path = output_image_dir / image_path.name
            with Image.open(image_path) as image:
                enhanced = enhance_image(image, preset)
                save_kwargs = {}
                if image_path.suffix.lower() in {".jpg", ".jpeg"}:
                    save_kwargs = {"quality": 95, "subsampling": 0}
                enhanced.save(output_path, **save_kwargs)
            image_count += 1

    label_count = copy_labels(source_dir, output_dir)
    write_data_yaml(output_dir, names)

    print(f"Enhanced {image_count} images with '{preset}' preset")
    print(f"Copied {label_count} label files")
    print(f"Wrote {output_dir / 'data.yaml'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Enhance YOLO dataset images while keeping labels unchanged")
    parser.add_argument(
        "--source",
        default="archive/Final_Dataset",
        help="Source YOLO dataset directory",
    )
    parser.add_argument(
        "--output",
        default="archive/Final_Dataset_enhanced",
        help="Output YOLO dataset directory",
    )
    parser.add_argument(
        "--preset",
        choices=sorted(PRESETS),
        default="balanced",
        help="Enhancement strength",
    )
    parser.add_argument(
        "--names",
        help="Comma-separated class names. Defaults to car,person,motorcycle,bus,truck,bicycle,train",
    )
    parser.add_argument("--overwrite", action="store_true", help="Replace output directory if it already exists")
    args = parser.parse_args()

    enhance_dataset(
        source_dir=Path(args.source),
        output_dir=Path(args.output),
        preset=args.preset,
        names=parse_names(args.names),
        overwrite=args.overwrite,
    )


if __name__ == "__main__":
    main()

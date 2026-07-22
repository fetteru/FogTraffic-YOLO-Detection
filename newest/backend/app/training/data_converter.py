"""Dataset annotation converters for YOLO text format."""

from __future__ import annotations

import json
import os
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

from app.core.logger import get_logger


logger = get_logger(__name__)


class DataConverter:
    """Convert VOC, COCO and LabelMe annotations to YOLO TXT labels."""

    @staticmethod
    def voc_to_yolo(xml_dir: str, output_dir: str, class_mapping: dict[str, int]) -> dict:
        os.makedirs(output_dir, exist_ok=True)
        stats = {"total": 0, "converted": 0, "skipped": 0, "errors": []}

        xml_files = sorted(Path(xml_dir).glob("*.xml"))
        if not xml_files:
            logger.warning("No VOC XML files found in %s", xml_dir)
            return stats

        for xml_file in xml_files:
            stats["total"] += 1
            try:
                root = ET.parse(xml_file).getroot()
                size = root.find("size")
                if size is None:
                    stats["skipped"] += 1
                    continue

                img_width = int(float(size.findtext("width", "0")))
                img_height = int(float(size.findtext("height", "0")))
                if img_width <= 0 or img_height <= 0:
                    stats["skipped"] += 1
                    continue

                yolo_lines = []
                for obj in root.findall("object"):
                    class_name = (obj.findtext("name") or "").strip()
                    if class_name not in class_mapping:
                        logger.warning("Unknown VOC class %s in %s", class_name, xml_file.name)
                        continue

                    bbox = obj.find("bndbox")
                    if bbox is None:
                        continue

                    xmin = float(bbox.findtext("xmin", "0"))
                    ymin = float(bbox.findtext("ymin", "0"))
                    xmax = float(bbox.findtext("xmax", "0"))
                    ymax = float(bbox.findtext("ymax", "0"))
                    line = DataConverter._to_yolo_line(
                        class_mapping[class_name], xmin, ymin, xmax, ymax, img_width, img_height
                    )
                    if line:
                        yolo_lines.append(line)

                (Path(output_dir) / f"{xml_file.stem}.txt").write_text(
                    "\n".join(yolo_lines), encoding="utf-8"
                )
                stats["converted"] += 1
            except ET.ParseError as exc:
                stats["skipped"] += 1
                stats["errors"].append(f"{xml_file.name}: {exc}")
            except Exception as exc:
                stats["skipped"] += 1
                stats["errors"].append(f"{xml_file.name}: {exc}")
                logger.error("VOC conversion failed for %s: %s", xml_file, exc)

        return stats

    @staticmethod
    def coco_to_yolo(
        json_file: str,
        output_dir: str,
        class_mapping: dict[str, int] | None = None,
    ) -> dict:
        os.makedirs(output_dir, exist_ok=True)
        stats = {"total": 0, "converted": 0, "skipped": 0, "errors": [], "image_files": []}

        try:
            data = json.loads(Path(json_file).read_text(encoding="utf-8"))
        except Exception as exc:
            stats["errors"].append(str(exc))
            logger.error("COCO JSON read failed for %s: %s", json_file, exc)
            return stats

        categories = {cat["id"]: cat.get("name", str(cat["id"])) for cat in data.get("categories", [])}
        if class_mapping is None:
            class_mapping = {name: idx for idx, name in enumerate(categories.values())}
        category_mapping = {
            category_id: class_mapping[name]
            for category_id, name in categories.items()
            if name in class_mapping
        }

        annotations_by_image: dict[int, list[dict]] = defaultdict(list)
        for ann in data.get("annotations", []):
            annotations_by_image[ann.get("image_id")].append(ann)

        for image in data.get("images", []):
            stats["total"] += 1
            image_id = image.get("id")
            file_name = image.get("file_name", f"{image_id}.jpg")
            img_width = int(image.get("width") or 0)
            img_height = int(image.get("height") or 0)
            if img_width <= 0 or img_height <= 0:
                stats["skipped"] += 1
                continue

            yolo_lines = []
            for ann in annotations_by_image.get(image_id, []):
                category_id = ann.get("category_id")
                if category_id not in category_mapping:
                    continue
                x, y, w, h = [float(v) for v in ann.get("bbox", [0, 0, 0, 0])]
                line = DataConverter._to_yolo_line(
                    category_mapping[category_id], x, y, x + w, y + h, img_width, img_height
                )
                if line:
                    yolo_lines.append(line)

            stem = Path(file_name).stem
            (Path(output_dir) / f"{stem}.txt").write_text("\n".join(yolo_lines), encoding="utf-8")
            stats["converted"] += 1
            stats["image_files"].append(file_name)

        return stats

    @staticmethod
    def labelme_to_yolo(json_dir: str, output_dir: str, class_mapping: dict[str, int]) -> dict:
        os.makedirs(output_dir, exist_ok=True)
        stats = {"total": 0, "converted": 0, "skipped": 0, "errors": [], "image_files": []}

        json_files = sorted(Path(json_dir).glob("*.json"))
        if not json_files:
            logger.warning("No LabelMe JSON files found in %s", json_dir)
            return stats

        for json_file in json_files:
            stats["total"] += 1
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                img_width = int(data.get("imageWidth") or 0)
                img_height = int(data.get("imageHeight") or 0)
                if img_width <= 0 or img_height <= 0:
                    stats["skipped"] += 1
                    continue

                yolo_lines = []
                for shape in data.get("shapes", []):
                    label = shape.get("label")
                    points = shape.get("points") or []
                    if label not in class_mapping or not points:
                        continue

                    xs = [float(p[0]) for p in points]
                    ys = [float(p[1]) for p in points]
                    line = DataConverter._to_yolo_line(
                        class_mapping[label], min(xs), min(ys), max(xs), max(ys), img_width, img_height
                    )
                    if line:
                        yolo_lines.append(line)

                (Path(output_dir) / f"{json_file.stem}.txt").write_text(
                    "\n".join(yolo_lines), encoding="utf-8"
                )
                stats["converted"] += 1
                if data.get("imagePath"):
                    stats["image_files"].append(data["imagePath"])
            except Exception as exc:
                stats["skipped"] += 1
                stats["errors"].append(f"{json_file.name}: {exc}")
                logger.error("LabelMe conversion failed for %s: %s", json_file, exc)

        return stats

    @staticmethod
    def _to_yolo_line(
        class_id: int,
        xmin: float,
        ymin: float,
        xmax: float,
        ymax: float,
        img_width: int,
        img_height: int,
    ) -> str | None:
        xmin = max(0.0, min(float(xmin), float(img_width)))
        ymin = max(0.0, min(float(ymin), float(img_height)))
        xmax = max(0.0, min(float(xmax), float(img_width)))
        ymax = max(0.0, min(float(ymax), float(img_height)))
        if xmax <= xmin or ymax <= ymin:
            return None

        x_center = (xmin + xmax) / 2.0 / img_width
        y_center = (ymin + ymax) / 2.0 / img_height
        width = (xmax - xmin) / img_width
        height = (ymax - ymin) / img_height
        return f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"

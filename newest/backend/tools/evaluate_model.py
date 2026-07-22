"""Evaluate a YOLO model and write a JSON report."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate a YOLO model on train/val/test split")
    parser.add_argument("--weights", "-w", required=True, help="Path to best.pt")
    parser.add_argument("--data", "-d", default="datasets/rsod/raindataset/data.yaml", help="Path to data.yaml")
    parser.add_argument("--split", "-s", default="val", choices=["train", "val", "test"])
    parser.add_argument("--conf", type=float, default=0.001)
    parser.add_argument("--iou", type=float, default=0.6)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--device", default="0")
    parser.add_argument("--output", default="models/eval_report")
    parser.add_argument("--name", default="")
    return parser.parse_args()


def metrics_to_report(results, model, args: argparse.Namespace, save_dir: Path) -> dict:
    overall = {
        "precision": round(float(results.box.mp), 6),
        "recall": round(float(results.box.mr), 6),
        "map50": round(float(results.box.map50), 6),
        "map50_95": round(float(results.box.map), 6),
    }
    per_class = {}
    if results.box.ap is not None:
        for index, ap50 in enumerate(results.box.ap50):
            class_name = model.names.get(index, f"class_{index}")
            ap50_95 = results.box.ap[index] if index < len(results.box.ap) else 0.0
            per_class[class_name] = {
                "ap50": round(float(ap50), 6),
                "ap50_95": round(float(ap50_95), 6),
            }

    return {
        "weights": str(Path(args.weights)),
        "data": str(Path(args.data)),
        "split": args.split,
        "conf": args.conf,
        "iou": args.iou,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "device": args.device,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "overall": overall,
        "per_class": per_class,
        "artifacts_dir": str(save_dir),
    }


def main() -> None:
    args = parse_args()
    weights = Path(args.weights)
    data_yaml = Path(args.data)
    if not weights.exists():
        raise FileNotFoundError(f"weights not found: {weights}")
    if not data_yaml.exists():
        raise FileNotFoundError(f"data.yaml not found: {data_yaml}")

    from ultralytics import YOLO

    output_dir = Path(args.output)
    run_name = args.name or f"{weights.parent.parent.name}_{args.split}"
    model = YOLO(str(weights))
    results = model.val(
        data=str(data_yaml),
        split=args.split,
        conf=args.conf,
        iou=args.iou,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        plots=True,
        project=str(output_dir),
        name=run_name,
        exist_ok=True,
    )

    save_dir = Path(results.save_dir)
    report = metrics_to_report(results, model, args, save_dir)
    report_path = save_dir / "eval_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Evaluation complete")
    print(f"mAP50: {report['overall']['map50']:.4f}")
    print(f"mAP50-95: {report['overall']['map50_95']:.4f}")
    print(f"Precision: {report['overall']['precision']:.4f}")
    print(f"Recall: {report['overall']['recall']:.4f}")
    print(f"Report: {report_path}")


if __name__ == "__main__":
    main()

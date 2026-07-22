"""Standalone YOLOv11 training script for GPU cloud machines."""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Run standalone YOLOv11 training")
    parser.add_argument("--data", default="datasets/rsod/yolo_dataset/data.yaml")
    parser.add_argument("--model", default="yolov11n")
    parser.add_argument("--epochs", "-e", type=int, default=100)
    parser.add_argument("--batch", "-b", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--device", default="0")
    parser.add_argument("--output", default="runs/cloud_train")
    parser.add_argument("--name", default="")
    parser.add_argument("--workers", type=int, default=0)
    args = parser.parse_args()

    data_yaml = Path(args.data)
    if not data_yaml.exists():
        raise FileNotFoundError(f"data.yaml does not exist: {data_yaml}")

    from ultralytics import YOLO

    name = args.name or f"{args.model}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    model_file = args.model if args.model.endswith(".pt") else f"{args.model}.pt"
    model = YOLO(model_file)
    model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        project=args.output,
        name=name,
        exist_ok=True,
        plots=True,
        workers=args.workers,
    )
    print(f"Training output: {Path(args.output) / name}")


if __name__ == "__main__":
    main()

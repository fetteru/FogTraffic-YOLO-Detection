# rain_yolo_multiclass_v1_final

Final YOLO11n multi-class traffic-object detection model.

## Files

- `best.pt`: final model weights
- `data.yaml`: dataset/class configuration
- `eval_report.json`: test-set evaluation report
- `results.png`: training curves
- `confusion_matrix.png`: confusion matrix
- `PR_curve.png`: precision-recall curve
- `F1_curve.png`: F1 curve

## Model

- Base model: `yolo11n.pt`
- Image size: `640`
- Recommended confidence threshold: `0.25`
- Recommended IoU threshold: `0.45`
- Dataset: `datasets/rsod/raindataset`

## Classes

Class order follows `data.yaml`:

| ID | Class |
|---:|---|
| 0 | car |
| 1 | person |
| 2 | motorcycle |
| 3 | bus |
| 4 | truck |
| 5 | bicycle |
| 6 | train |

## Test Set Metrics

Evaluated on the test split with:

```powershell
python tools/evaluate_model.py --weights runs/train/rain_yolo_multiclass_v1(final)/weights/best.pt --data datasets/rsod/raindataset/data.yaml --split test --batch 4 --device 0
```

| Metric | Value |
|---|---:|
| Precision | 0.4762 |
| Recall | 0.6882 |
| mAP@50 | 0.5143 |
| mAP@50-95 | 0.3204 |

## Usage

Example prediction command:

```powershell
yolo detect predict model=models/rain_yolo_multiclass_v1_final/best.pt source=path/to/image_or_folder imgsz=640 conf=0.25 iou=0.45 device=0
```

Python usage:

```python
from ultralytics import YOLO

model = YOLO("models/rain_yolo_multiclass_v1_final/best.pt")
results = model.predict("path/to/image.jpg", imgsz=640, conf=0.25, iou=0.45)
```

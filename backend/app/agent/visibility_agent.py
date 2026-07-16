"""Visibility and scene-quality analysis for rain/fog/low-light traffic scenes."""

from __future__ import annotations

from pathlib import Path
from statistics import mean

import cv2
import numpy as np


def analyze_image_file(image_path: str | Path, detections: list[dict] | None = None) -> dict:
    """Analyze image visibility from brightness, contrast, sharpness and detection confidence."""
    image = cv2.imread(str(image_path))
    if image is None:
        return _fallback_visibility(detections, ["图像读取失败，无法计算可见性指标"])
    return analyze_frame(image, detections=detections)


def analyze_frame(frame, detections: list[dict] | None = None) -> dict:
    """Analyze one OpenCV BGR frame."""
    if frame is None:
        return _fallback_visibility(detections, ["帧为空，无法计算可见性指标"])

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    confidence = _confidence_metrics(detections or [])

    evidence = []
    risk_score = 0

    if brightness < 55:
        risk_score += 2
        evidence.append("画面亮度较低，疑似夜间、低光或曝光不足场景")
    elif brightness < 85:
        risk_score += 1
        evidence.append("画面亮度偏低，可能影响远距离目标识别")
    elif brightness > 220:
        risk_score += 1
        evidence.append("画面亮度过高，存在过曝风险")

    if contrast < 18:
        risk_score += 2
        evidence.append("画面对比度较低，具有雾化、雨雾或低能见度特征")
    elif contrast < 32:
        risk_score += 1
        evidence.append("画面对比度偏低，目标边界可能不够清晰")

    if sharpness < 35:
        risk_score += 1
        evidence.append("画面清晰度偏低，可能是摄像头分辨率、压缩或雨雾遮挡造成")

    avg_confidence = confidence["avg_confidence"]
    if avg_confidence is not None and avg_confidence < 0.45:
        risk_score += 1
        evidence.append("目标平均置信度偏低，检测可靠性需要人工复核")
    if confidence["low_confidence_ratio"] >= 0.4 and confidence["count"] > 0:
        risk_score += 1
        evidence.append("低置信度目标占比较高，雨雾低光环境可能影响识别稳定性")

    if not evidence:
        evidence.append("画面亮度、对比度和目标置信度整体较稳定")

    return {
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "sharpness": round(sharpness, 2),
        "avg_confidence": avg_confidence,
        "low_confidence_ratio": confidence["low_confidence_ratio"],
        "visibility_risk": _risk_name(risk_score),
        "visibility_score": min(3, risk_score),
        "scene_quality": _scene_quality(brightness, contrast, sharpness),
        "evidence": evidence,
        "note": "该结果评估的是视觉可见性风险，不等同于气象站真实天气结论。",
    }


def aggregate_visibility(samples: list[dict]) -> dict:
    """Aggregate visibility samples from video key frames."""
    samples = [sample for sample in samples if sample]
    if not samples:
        return _fallback_visibility([], ["没有可用关键帧，无法聚合可见性指标"])

    brightness = mean(sample.get("brightness", 0) for sample in samples)
    contrast = mean(sample.get("contrast", 0) for sample in samples)
    sharpness = mean(sample.get("sharpness", 0) for sample in samples)
    avg_conf_values = [
        sample["avg_confidence"]
        for sample in samples
        if sample.get("avg_confidence") is not None
    ]
    low_confidence_ratio = mean(sample.get("low_confidence_ratio", 0) for sample in samples)
    score = round(mean(sample.get("visibility_score", 0) for sample in samples))
    evidence = []
    for sample in samples:
        for item in sample.get("evidence", []):
            if item not in evidence:
                evidence.append(item)
            if len(evidence) >= 4:
                break
        if len(evidence) >= 4:
            break

    return {
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "sharpness": round(sharpness, 2),
        "avg_confidence": round(mean(avg_conf_values), 4) if avg_conf_values else None,
        "low_confidence_ratio": round(low_confidence_ratio, 4),
        "visibility_risk": _risk_name(score),
        "visibility_score": min(3, score),
        "scene_quality": _scene_quality(brightness, contrast, sharpness),
        "evidence": evidence or ["视频关键帧可见性整体较稳定"],
        "note": "该结果评估的是视频关键帧的视觉可见性风险，不等同于气象站真实天气结论。",
    }


def _confidence_metrics(detections: list[dict]) -> dict:
    confidences = [
        float(item.get("confidence", 0))
        for item in detections
        if item.get("confidence") is not None
    ]
    if not confidences:
        return {"count": 0, "avg_confidence": None, "low_confidence_ratio": 0.0}
    low_count = sum(1 for value in confidences if value < 0.5)
    return {
        "count": len(confidences),
        "avg_confidence": round(mean(confidences), 4),
        "low_confidence_ratio": round(low_count / len(confidences), 4),
    }


def _fallback_visibility(detections: list[dict] | None, evidence: list[str]) -> dict:
    confidence = _confidence_metrics(detections or [])
    return {
        "brightness": None,
        "contrast": None,
        "sharpness": None,
        "avg_confidence": confidence["avg_confidence"],
        "low_confidence_ratio": confidence["low_confidence_ratio"],
        "visibility_risk": "unknown",
        "visibility_score": 0,
        "scene_quality": "unknown",
        "evidence": evidence,
        "note": "缺少图像质量指标时，仅能参考检测置信度。",
    }


def _risk_name(score: int | float) -> str:
    if score >= 3:
        return "high"
    if score >= 1:
        return "medium"
    return "low"


def _scene_quality(brightness: float, contrast: float, sharpness: float) -> str:
    if brightness < 55:
        return "low_light"
    if contrast < 25:
        return "low_visibility_or_fog"
    if sharpness < 60:
        return "blurred"
    return "clear"

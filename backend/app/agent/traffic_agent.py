"""Traffic statistics agent for detection outputs."""

from __future__ import annotations

from collections import Counter


VEHICLE_CLASSES = {
    "car",
    "truck",
    "bus",
    "motorcycle",
    "motorbike",
    "bicycle",
    "van",
    "suv",
    "vehicle",
    "emergency",
}
LARGE_VEHICLE_CLASSES = {"truck", "bus", "van"}
VULNERABLE_CLASSES = {"person", "pedestrian", "motorcycle", "motorbike", "bicycle"}


def analyze_detection_result(result: dict) -> dict:
    """Analyze traffic counts from one image or an aggregated detection result."""
    detections = result.get("detections") or []
    class_counts = Counter()
    if detections:
        class_counts.update(_norm(item.get("class_name")) for item in detections)
    else:
        class_counts.update({_norm(k): int(v) for k, v in (result.get("class_counts") or {}).items()})

    return _build_statistics(class_counts, unique_vehicle_count=None, scope="image")


def analyze_video_frames(frames: list[dict], fallback_class_counts: dict | None = None) -> dict:
    """Analyze sampled video frames, preferring unique track IDs when available."""
    sampled_class_counts = Counter()
    unique_class_counts = Counter()
    track_classes = {}
    unique_vehicle_tracks = set()
    sampled_vehicle_instances = 0

    for frame in frames or []:
        for item in frame.get("detections", []):
            class_name = _norm(item.get("class_name"))
            sampled_class_counts[class_name] += 1
            if class_name in VEHICLE_CLASSES:
                sampled_vehicle_instances += 1
                track_id = item.get("track_id")
                if track_id is not None:
                    unique_vehicle_tracks.add(track_id)
                    track_classes.setdefault(track_id, class_name)

    unique_class_counts.update(track_classes.values())
    class_counts_for_risk = unique_class_counts or sampled_class_counts

    if not sampled_class_counts and fallback_class_counts:
        sampled_class_counts.update({_norm(k): int(v) for k, v in fallback_class_counts.items()})
        class_counts_for_risk = sampled_class_counts
        sampled_vehicle_instances = sum(
            count for name, count in sampled_class_counts.items() if name in VEHICLE_CLASSES
        )

    unique_vehicle_count = len(unique_vehicle_tracks) if unique_vehicle_tracks else None
    stats = _build_statistics(class_counts_for_risk, unique_vehicle_count=unique_vehicle_count, scope="video")
    stats["sampled_class_counts"] = dict(sampled_class_counts)
    stats["unique_class_counts"] = dict(unique_class_counts)
    stats["sampled_vehicle_instances"] = sampled_vehicle_instances
    stats["counting_note"] = (
        "已基于 track_id 估算唯一车辆数"
        if unique_vehicle_count is not None
        else "当前为采样帧检测次数统计，未启用唯一车辆去重"
    )
    return stats


def _build_statistics(class_counts: Counter, unique_vehicle_count: int | None, scope: str) -> dict:
    vehicle_count = sum(count for name, count in class_counts.items() if name in VEHICLE_CLASSES)
    pedestrian_count = class_counts.get("person", 0) + class_counts.get("pedestrian", 0)
    vulnerable_count = sum(count for name, count in class_counts.items() if name in VULNERABLE_CLASSES)
    large_vehicle_count = sum(count for name, count in class_counts.items() if name in LARGE_VEHICLE_CLASSES)
    traffic_count = unique_vehicle_count if unique_vehicle_count is not None else vehicle_count

    return {
        "scope": scope,
        "class_counts": dict(class_counts),
        "vehicle_count": vehicle_count,
        "unique_vehicle_count": unique_vehicle_count,
        "traffic_count_for_risk": traffic_count,
        "pedestrian_count": pedestrian_count,
        "vulnerable_road_user_count": vulnerable_count,
        "large_vehicle_count": large_vehicle_count,
        "large_vehicle_ratio": round(large_vehicle_count / vehicle_count, 4) if vehicle_count else 0,
        "density_level": _density_level(traffic_count, scope),
        "density_score": _density_score(traffic_count, scope),
    }


def _density_level(count: int, scope: str) -> str:
    score = _density_score(count, scope)
    if score >= 3:
        return "high"
    if score >= 2:
        return "medium"
    if score >= 1:
        return "low"
    return "none"


def _density_score(count: int, scope: str) -> int:
    if scope == "video":
        if count >= 60:
            return 3
        if count >= 25:
            return 2
        if count >= 1:
            return 1
        return 0
    if count >= 12:
        return 3
    if count >= 5:
        return 2
    if count >= 1:
        return 1
    return 0


def _norm(name) -> str:
    return str(name or "unknown").strip().lower()

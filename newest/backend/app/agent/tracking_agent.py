"""Simple IoU-based tracking agent for sampled video detections."""

from __future__ import annotations

from dataclasses import dataclass

from app.agent.traffic_agent import VEHICLE_CLASSES


@dataclass
class Track:
    track_id: int
    bbox: list[float]
    class_name: str
    last_frame: int
    lost: int = 0


class SimpleIoUTracker:
    """Assign stable track IDs to vehicle detections using IoU and center-distance matching."""

    def __init__(
        self,
        iou_threshold: float = 0.12,
        max_lost: int = 15,
        center_distance_ratio: float = 1.35,
    ) -> None:
        self.iou_threshold = iou_threshold
        self.max_lost = max_lost
        self.center_distance_ratio = center_distance_ratio
        self._next_id = 1
        self._tracks: dict[int, Track] = {}
        self._track_classes: dict[int, str] = {}

    def update(self, detections: list[dict], frame_number: int) -> list[dict]:
        tracked = []
        used_track_ids = set()

        for detection in detections:
            item = dict(detection)
            class_name = _norm(item.get("class_name"))
            if class_name not in VEHICLE_CLASSES:
                tracked.append(item)
                continue

            best_track = None
            best_score = 0.0
            best_iou = 0.0
            for track in self._tracks.values():
                if track.track_id in used_track_ids:
                    continue
                if not _is_compatible_vehicle_class(_norm(track.class_name), class_name):
                    continue
                current_iou = bbox_iou(item.get("bbox", []), track.bbox)
                center_score = bbox_center_score(
                    item.get("bbox", []),
                    track.bbox,
                    self.center_distance_ratio,
                )
                score = max(current_iou, center_score)
                if score > best_score:
                    best_score = score
                    best_iou = current_iou
                    best_track = track

            if best_track and best_score >= self.iou_threshold:
                best_track.bbox = item.get("bbox", best_track.bbox)
                best_track.class_name = _prefer_vehicle_class(best_track.class_name, class_name)
                best_track.last_frame = frame_number
                best_track.lost = 0
                item["track_id"] = best_track.track_id
                item["track_iou"] = round(best_iou, 4)
                item["track_score"] = round(best_score, 4)
                used_track_ids.add(best_track.track_id)
            else:
                track_id = self._next_id
                self._next_id += 1
                self._tracks[track_id] = Track(
                    track_id=track_id,
                    bbox=item.get("bbox", [0, 0, 0, 0]),
                    class_name=class_name,
                    last_frame=frame_number,
                )
                self._track_classes[track_id] = class_name
                item["track_id"] = track_id
                item["track_iou"] = None
                item["track_score"] = None
                used_track_ids.add(track_id)
            tracked.append(item)

        self._age_tracks(used_track_ids)
        return tracked

    @property
    def unique_vehicle_count(self) -> int:
        return self._next_id - 1

    @property
    def unique_vehicle_class_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for class_name in self._track_classes.values():
            counts[class_name] = counts.get(class_name, 0) + 1
        return counts

    def _age_tracks(self, used_track_ids: set[int]) -> None:
        for track_id in list(self._tracks.keys()):
            if track_id in used_track_ids:
                continue
            self._tracks[track_id].lost += 1
            if self._tracks[track_id].lost > self.max_lost:
                self._tracks.pop(track_id, None)


def assign_tracks_to_frames(frames: list[dict], iou_threshold: float = 0.25) -> tuple[list[dict], int]:
    """Assign track IDs to an existing list of video frame results."""
    tracker = SimpleIoUTracker(iou_threshold=iou_threshold)
    output = []
    for frame in frames:
        item = dict(frame)
        item["detections"] = tracker.update(
            item.get("detections", []),
            int(item.get("frame_number") or item.get("frame_index") or 0),
        )
        output.append(item)
    return output, tracker.unique_vehicle_count


def bbox_iou(box_a: list[float], box_b: list[float]) -> float:
    if len(box_a) < 4 or len(box_b) < 4:
        return 0.0
    ax1, ay1, ax2, ay2 = [float(value) for value in box_a[:4]]
    bx1, by1, bx2, by2 = [float(value) for value in box_b[:4]]
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter_area
    if union <= 0:
        return 0.0
    return inter_area / union


def bbox_center_score(box_a: list[float], box_b: list[float], distance_ratio: float) -> float:
    if len(box_a) < 4 or len(box_b) < 4:
        return 0.0
    ax1, ay1, ax2, ay2 = [float(value) for value in box_a[:4]]
    bx1, by1, bx2, by2 = [float(value) for value in box_b[:4]]
    aw = max(1.0, ax2 - ax1)
    ah = max(1.0, ay2 - ay1)
    bw = max(1.0, bx2 - bx1)
    bh = max(1.0, by2 - by1)
    acx, acy = (ax1 + ax2) / 2, (ay1 + ay2) / 2
    bcx, bcy = (bx1 + bx2) / 2, (by1 + by2) / 2
    dx = abs(acx - bcx)
    dy = abs(acy - bcy)
    limit_x = max(aw, bw) * distance_ratio
    limit_y = max(ah, bh) * distance_ratio
    if dx > limit_x or dy > limit_y:
        return 0.0
    x_score = 1.0 - dx / limit_x if limit_x else 0.0
    y_score = 1.0 - dy / limit_y if limit_y else 0.0
    return max(0.0, min(x_score, y_score))


def _norm(name) -> str:
    return str(name or "unknown").strip().lower()


def _is_compatible_vehicle_class(track_class: str, detection_class: str) -> bool:
    if track_class == detection_class:
        return True
    return track_class in VEHICLE_CLASSES and detection_class in VEHICLE_CLASSES


def _prefer_vehicle_class(old_class: str, new_class: str) -> str:
    # CCTV rain/fog footage often flips the same vehicle between car/truck/bus.
    # Keep the more safety-relevant large-vehicle class when that happens.
    priority = {"bus": 4, "truck": 3, "van": 2, "car": 1}
    old_name = _norm(old_class)
    new_name = _norm(new_class)
    return new_name if priority.get(new_name, 0) > priority.get(old_name, 0) else old_name

import numpy as np

from app.agent.visibility_agent import analyze_frame


def test_quality_issues_alone_do_not_become_high_visibility_risk():
    gradient = np.tile(np.linspace(90, 210, 640, dtype=np.uint8), (360, 1))
    frame = np.dstack([gradient, gradient, gradient])
    detections = [
        {"confidence": 0.31},
        {"confidence": 0.36},
    ]

    visibility = analyze_frame(frame, detections)

    assert visibility["visibility_score"] == 1
    assert visibility["visual_quality_score"] >= 2
    assert visibility["visibility_risk"] == "medium"

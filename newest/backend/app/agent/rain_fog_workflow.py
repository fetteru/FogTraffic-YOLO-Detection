"""Rain/fog traffic management multi-agent workflow."""

from __future__ import annotations

from typing import TypedDict

from app.agent.alert_agent import build_alert, save_alert
from app.agent.report_agent import generate_report
from app.agent.risk_agent import assess_risk
from app.agent.traffic_agent import analyze_detection_result, analyze_video_frames
from app.agent.visibility_agent import (
    aggregate_visibility,
    analyze_image_file,
)


class WorkflowState(TypedDict, total=False):
    result: dict
    image_path: str
    frames: list[dict]
    visibility_samples: list[dict]
    db_task_id: int
    visibility: dict
    traffic: dict
    risk: dict
    alert: dict | None
    report: str


def run_rain_fog_workflow(
    result: dict,
    image_path: str | None = None,
    frames: list[dict] | None = None,
    visibility_samples: list[dict] | None = None,
    db_task_id: int | None = None,
) -> dict:
    """Run Detection -> Visibility -> Traffic -> Risk -> Alert -> Report post-processing."""
    if frames is not None:
        visibility = aggregate_visibility(visibility_samples or [])
        traffic = analyze_video_frames(frames, fallback_class_counts=result.get("class_counts"))
    else:
        visibility = analyze_image_file(image_path, result.get("detections", [])) if image_path else aggregate_visibility([])
        traffic = analyze_detection_result(result)

    risk = assess_risk(visibility, traffic)
    alert = build_alert(risk, traffic, visibility)
    alert_id = save_alert(db_task_id, alert)
    if alert:
        alert["alert_id"] = alert_id

    report = generate_report(result, visibility, traffic, risk)
    return {
        "visibility": visibility,
        "traffic": traffic,
        "risk": risk,
        "alert": alert,
        "report": report,
    }


def build_langgraph_workflow():
    """Optional LangGraph graph for the same workflow.

    The production path currently uses run_rain_fog_workflow() so the project
    works without any LLM API key. This graph is kept as a clean extension point
    for classroom/demo use when you want to explicitly show LangGraph.
    """
    try:
        from langgraph.graph import END, StateGraph
    except Exception:
        return None

    def visibility_node(state: WorkflowState) -> WorkflowState:
        if state.get("frames") is not None:
            state["visibility"] = aggregate_visibility(state.get("visibility_samples") or [])
        else:
            state["visibility"] = analyze_image_file(
                state.get("image_path", ""),
                state.get("result", {}).get("detections", []),
            )
        return state

    def traffic_node(state: WorkflowState) -> WorkflowState:
        if state.get("frames") is not None:
            state["traffic"] = analyze_video_frames(
                state.get("frames") or [],
                fallback_class_counts=state.get("result", {}).get("class_counts"),
            )
        else:
            state["traffic"] = analyze_detection_result(state.get("result", {}))
        return state

    def risk_node(state: WorkflowState) -> WorkflowState:
        state["risk"] = assess_risk(state["visibility"], state["traffic"])
        return state

    def alert_node(state: WorkflowState) -> WorkflowState:
        alert = build_alert(state["risk"], state["traffic"], state["visibility"])
        alert_id = save_alert(state.get("db_task_id"), alert)
        if alert:
            alert["alert_id"] = alert_id
        state["alert"] = alert
        return state

    def report_node(state: WorkflowState) -> WorkflowState:
        state["report"] = generate_report(
            state.get("result", {}),
            state["visibility"],
            state["traffic"],
            state["risk"],
        )
        return state

    graph = StateGraph(WorkflowState)
    graph.add_node("visibility_agent", visibility_node)
    graph.add_node("traffic_agent", traffic_node)
    graph.add_node("risk_agent", risk_node)
    graph.add_node("alert_agent", alert_node)
    graph.add_node("report_agent", report_node)
    graph.set_entry_point("visibility_agent")
    graph.add_edge("visibility_agent", "traffic_agent")
    graph.add_edge("traffic_agent", "risk_agent")
    graph.add_edge("risk_agent", "alert_agent")
    graph.add_edge("alert_agent", "report_agent")
    graph.add_edge("report_agent", END)
    return graph.compile()

"""Analysis service: enqueue jobs and persist spans/suggestions."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence
from uuid import uuid4

from sqlmodel import Session, delete, select

from ..models import (
    AnalysisSpan,
    AnalysisSuggestion,
    Campaign,
    CampaignBrandVoice,
    Post,
    PostAnalysis,
    PostMedia,
)
from ..schemas import AnalysisOut, AnalysisSpan as AnalysisSpanSchema, AnalysisSuggestion as AnalysisSuggestionSchema
from .ai_adapter import generate_feedback
from .queue import job_queue


def snapshot_post(session: Session, post: Post) -> dict:
    campaign: Optional[Campaign] = session.get(Campaign, post.campaign_id)
    media_rows: Sequence[PostMedia] = list(
        session.exec(select(PostMedia).where(PostMedia.post_id == post.id))
    )
    brand_voice = list(
        session.exec(
            select(CampaignBrandVoice.tag).where(CampaignBrandVoice.campaign_id == post.campaign_id)
        )
    )
    return {
        "post_id": post.id,
        "campaign_id": post.campaign_id,
        "title": post.title,
        "caption": post.caption,
        "platform": post.platform,
        "status": post.status,
        "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
        "published_at": post.published_at.isoformat() if post.published_at else None,
        "media": [{"id": m.id, "url": m.url, "type": m.type} for m in media_rows],
        "campaign": {
            "overview": campaign.brief_overview if campaign else "",
            "target_audience": campaign.brief_target_audience if campaign else "",
            "guardrails": campaign.brief_guardrails if campaign else "",
            "brand_voice": brand_voice,
        },
    }


def create_analysis(session: Session, post: Post) -> PostAnalysis:
    analysis = PostAnalysis(
        post_id=post.id,
        status="pending",
        source="ai",
        input_snapshot=snapshot_post(session, post),
    )
    session.add(analysis)
    session.commit()
    session.refresh(analysis)
    return analysis


def _clear_spans(session: Session, analysis_id: str) -> None:
    span_ids = [
        s_id
        for s_id in session.exec(
            select(AnalysisSpan.id).where(AnalysisSpan.analysis_id == analysis_id)
        )
    ]
    if span_ids:
        stmt_suggestions = delete(AnalysisSuggestion).where(AnalysisSuggestion.span_id.in_(span_ids))  # type: ignore[arg-type]
        session.exec(stmt_suggestions)  # type: ignore[arg-type]
    stmt_spans = delete(AnalysisSpan).where(AnalysisSpan.analysis_id == analysis_id)  # type: ignore[arg-type]
    session.exec(stmt_spans)  # type: ignore[arg-type]


def _span_offsets(text: str, spans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute non-overlapping offsets for spans based on text matching."""
    used: List[tuple[int, int]] = []

    def overlaps(start: int, end: int) -> bool:
        return any(not (end <= s or start >= e) for s, e in used)

    def find_slot(needle: str) -> Optional[tuple[int, int]]:
        if not needle:
            return None
        idx = 0
        while idx < len(text):
            found = text.find(needle, idx)
            if found == -1:
                return None
            end = found + len(needle)
            if not overlaps(found, end):
                used.append((found, end))
                return (found, end)
            idx = found + 1
        return None

    results: List[Dict[str, Any]] = []
    for span in spans:
        start = span.get("start_offset")
        end = span.get("end_offset")
        # Use provided offsets if valid
        if isinstance(start, int) and isinstance(end, int) and 0 <= start < end <= len(text):
            used.append((start, end))
            span_with_offsets = {**span, "start_offset": start, "end_offset": end}
            results.append(span_with_offsets)
            continue

        slot = find_slot(span.get("text", "") or "")
        if slot:
            results.append({**span, "start_offset": slot[0], "end_offset": slot[1]})
        else:
            results.append({**span, "start_offset": None, "end_offset": None})
    return results


def _persist_result(session: Session, analysis: PostAnalysis, data: Dict[str, Any]) -> None:
    _clear_spans(session, analysis.id)
    spans_payload = data.get("spans", []) or []
    caption = ""
    if isinstance(analysis.input_snapshot, dict):
        caption = analysis.input_snapshot.get("caption") or ""
    spans_with_offsets = _span_offsets(caption, spans_payload)

    for span in spans_with_offsets:
        span_row = AnalysisSpan(
            analysis_id=analysis.id,
            text=span.get("text", ""),
            severity=span.get("severity", "minor"),
            comment=span.get("comment") or span.get("message", ""),
            start_offset=span.get("start_offset"),
            end_offset=span.get("end_offset"),
        )
        session.add(span_row)
        session.commit()
        session.refresh(span_row)

        for sug in span.get("suggestions", []) or []:
                session.add(
                    AnalysisSuggestion(
                        span_id=span_row.id,
                        text=sug.get("text", ""),
                        rationale=sug.get("rationale"),
                    )
                )
    analysis.status = "complete"
    analysis.model = data.get("model")
    analysis.prompt_version = data.get("prompt_version")
    analysis.updated_at = datetime.utcnow()
    session.add(analysis)
    session.commit()


def _mark_failed(session: Session, analysis: PostAnalysis, error: str) -> None:
    analysis.status = "failed"
    analysis.error = error
    analysis.updated_at = datetime.utcnow()
    session.add(analysis)
    session.commit()


def enqueue_analysis(session: Session, post: Post) -> PostAnalysis:
    analysis = create_analysis(session, post)

    def job() -> None:
        with Session(session.get_bind()) as worker_sess:
            db_analysis = worker_sess.get(PostAnalysis, analysis.id)
            db_post = worker_sess.get(Post, post.id) if db_analysis else None
            if not db_analysis or not db_post:
                return
            try:
                db_analysis.status = "running"
                db_analysis.updated_at = datetime.utcnow()
                worker_sess.add(db_analysis)
                worker_sess.commit()

                result = generate_feedback(db_analysis.input_snapshot or {})
                _persist_result(worker_sess, db_analysis, result)
            except Exception as exc:  # pylint: disable=broad-except
                _mark_failed(worker_sess, db_analysis, str(exc))

    job_queue.enqueue(job)
    return analysis


def _analysis_out(session: Session, analysis: PostAnalysis) -> AnalysisOut:
    spans_rows: Sequence[AnalysisSpan] = list(
        session.exec(select(AnalysisSpan).where(AnalysisSpan.analysis_id == analysis.id))
    )
    span_ids = [s.id for s in spans_rows]
    suggestions_rows: Sequence[AnalysisSuggestion] = []
    if span_ids:
        suggestions_rows = list(
            session.exec(select(AnalysisSuggestion).where(AnalysisSuggestion.span_id.in_(span_ids)))  # type: ignore[arg-type]
        )
    suggestions_by_span: Dict[str, List[AnalysisSuggestion]] = {}
    for s in suggestions_rows:
        suggestions_by_span.setdefault(s.span_id, []).append(s)

    spans_payload = []
    for s in spans_rows:
        spans_payload.append(
            AnalysisSpanSchema(
                id=s.id,
                text=s.text,
                severity=s.severity,
                comment=s.comment,
                start_offset=s.start_offset,
                end_offset=s.end_offset,
                suggestions=[
                AnalysisSuggestionSchema(
                    id=sug.id,
                    text=sug.text,
                    rationale=sug.rationale,
                )
                for sug in suggestions_by_span.get(s.id, [])
            ],
        )
        )

    post = session.get(Post, analysis.post_id)
    stale = False
    if post and analysis.created_at and post.updated_at:
        stale = post.updated_at > analysis.created_at

    return AnalysisOut(
        analysis_id=analysis.id,
        status=analysis.status,
        spans=spans_payload,
        post_updated_after_snapshot=stale,
    )


def _draft_out(raw: Dict[str, Any]) -> AnalysisOut:
    spans_payload_raw = raw.get("spans") or []
    caption = (raw.get("input_snapshot") or {}).get("caption", "") if isinstance(raw, dict) else ""
    spans_with_offsets = _span_offsets(caption, spans_payload_raw) if isinstance(caption, str) else spans_payload_raw
    spans_payload = []
    for s in spans_with_offsets:
        spans_payload.append(
            AnalysisSpanSchema(
                id=s.get("id") or str(uuid4()),
                text=s.get("text", ""),
                severity=s.get("severity", "minor"),
                comment=s.get("comment") or s.get("message", ""),
                start_offset=s.get("start_offset"),
                end_offset=s.get("end_offset"),
                suggestions=[
                AnalysisSuggestionSchema(
                    id=sg.get("id") or str(uuid4()),
                    text=sg.get("text", ""),
                    rationale=sg.get("rationale"),
                )
                for sg in (s.get("suggestions") or [])
            ],
        )
        )

    return AnalysisOut(
        analysis_id=str(uuid4()),
        status="complete",
        spans=spans_payload,
        post_updated_after_snapshot=False,
    )


def run_draft(snapshot: Dict[str, Any]) -> AnalysisOut:
    result = generate_feedback(snapshot)
    # Attach snapshot so offsets can be computed
    result_with_snapshot = {**result, "input_snapshot": snapshot}
    return _draft_out(result_with_snapshot)


def get_analysis(session: Session, post_id: str, analysis_id: str) -> Optional[AnalysisOut]:
    analysis = session.get(PostAnalysis, analysis_id)
    if not analysis or analysis.post_id != post_id:
        return None
    return _analysis_out(session, analysis)


def latest_analysis(session: Session, post_id: str) -> Optional[AnalysisOut]:
    analysis = session.exec(
        select(PostAnalysis)
        .where(PostAnalysis.post_id == post_id)
        .order_by(PostAnalysis.created_at.desc())  # type: ignore[attr-defined]
    ).first()
    if not analysis:
        return None
    return _analysis_out(session, analysis)

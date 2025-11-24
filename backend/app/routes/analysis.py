"""Analysis endpoints for AI suggestions."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..deps import get_session
from ..models import Post
from ..schemas import AnalysisOut, AnalysisTriggerRequest
from ..services import analysis as analysis_service

router = APIRouter(prefix="/api", tags=["analysis"])


def _get_post(session: Session, post_id: str) -> Post:
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/posts/{post_id}/analysis", response_model=dict, status_code=201)
def trigger_analysis(
    post_id: str,
    payload: AnalysisTriggerRequest | None = None,
    session: Session = Depends(get_session),
):
    post = _get_post(session, post_id)
    analysis = analysis_service.enqueue_analysis(session, post)
    return {"analysis_id": analysis.id, "status": analysis.status}


@router.get("/posts/{post_id}/analysis/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    post_id: str, analysis_id: str, session: Session = Depends(get_session)
):
    result = analysis_service.get_analysis(session, post_id, analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.get("/posts/{post_id}/analysis/latest", response_model=Optional[AnalysisOut])
def get_latest_analysis(post_id: str, session: Session = Depends(get_session)):
    return analysis_service.latest_analysis(session, post_id)


@router.post("/analysis/draft", response_model=AnalysisOut)
def analyze_draft(payload: dict):
    """Run a draft analysis without persisting."""
    result = analysis_service.run_draft(payload)
    return result

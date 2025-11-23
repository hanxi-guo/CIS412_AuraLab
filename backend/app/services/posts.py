"""Post CRUD service helpers."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring,no-member
from datetime import datetime
from typing import List, Optional, Sequence

from sqlmodel import Session, delete, select

from ..config import MEDIA_MAX_PER_POST
from ..models import AnalysisSpan, AnalysisSuggestion, Post, PostAnalysis, PostMedia
from ..schemas import Media, MediaCreate, PostCreate, PostOut, PostUpdate
from .storage import delete_files


def _apply_media(
    session: Session, post_id: str, media_payload: Optional[List[MediaCreate]]
) -> List[PostMedia]:
    """Replace media rows for a post."""
    session.exec(delete(PostMedia).where(PostMedia.post_id == post_id))  # type: ignore[arg-type]
    created: List[PostMedia] = []
    if not media_payload:
        return created

    for item in media_payload[:MEDIA_MAX_PER_POST]:
        media_row = PostMedia(
            post_id=post_id,
            url=item.url,
            type=item.type,
            width=item.width,
            height=item.height,
            size_bytes=item.size_bytes,
        )
        session.add(media_row)
        created.append(media_row)
    return created


def create_post(session: Session, campaign_id: str, payload: PostCreate) -> Post:
    """Create a post and attach media."""
    post = Post(
        campaign_id=campaign_id,
        title=payload.title or "",
        caption=payload.caption or "",
        platform=payload.platform or "instagram",
        status=payload.status or "draft",
        scheduled_at=payload.scheduled_at,
    )
    session.add(post)
    session.commit()
    session.refresh(post)

    _apply_media(session, post.id, payload.media)
    session.commit()
    session.refresh(post)
    return post


def list_posts_for_campaign(session: Session, campaign_id: str) -> List[Post]:
    """List posts for a campaign."""
    statement = (
        select(Post)
        .where(Post.campaign_id == campaign_id)
        .order_by(Post.created_at.desc())  # type: ignore[attr-defined]
    )
    return list(session.exec(statement))


def get_post(session: Session, post_id: str) -> Optional[Post]:
    """Fetch a post by id."""
    return session.get(Post, post_id)


def update_post(session: Session, post: Post, payload: PostUpdate) -> Post:
    """Update post fields and media."""
    if payload.title is not None:
        post.title = payload.title
    if payload.caption is not None:
        post.caption = payload.caption
    if payload.platform is not None:
        post.platform = payload.platform
    if payload.status is not None:
        post.status = payload.status
    if payload.scheduled_at is not None:
        post.scheduled_at = payload.scheduled_at
    if payload.published_at is not None:
        post.published_at = payload.published_at

    post.updated_at = datetime.utcnow()
    session.add(post)
    session.commit()
    session.refresh(post)

    if payload.media is not None:
        _apply_media(session, post.id, payload.media)
        session.commit()
        session.refresh(post)

    return post


def delete_post(session: Session, post: Post) -> None:
    """Delete a post and its media."""
    media_rows: Sequence[PostMedia] = list(
        session.exec(select(PostMedia).where(PostMedia.post_id == post.id))
    )
    delete_files([m.url for m in media_rows])
    session.exec(delete(PostMedia).where(PostMedia.post_id == post.id))  # type: ignore[arg-type]

    # delete analyses and related spans/suggestions
    analysis_ids = [
        a_id
        for a_id in session.exec(
            select(PostAnalysis.id).where(PostAnalysis.post_id == post.id)
        )
    ]
    if analysis_ids:
        span_ids = [
            s_id
            for s_id in session.exec(
                select(AnalysisSpan.id).where(
                    AnalysisSpan.analysis_id.in_(analysis_ids)  # type: ignore[arg-type]
                )
            )
        ]
        if span_ids:
            stmt_suggestions = delete(AnalysisSuggestion).where(
                AnalysisSuggestion.span_id.in_(span_ids)  # type: ignore[arg-type]
            )
            session.exec(stmt_suggestions)  # type: ignore[arg-type]
            stmt_spans = delete(AnalysisSpan).where(
                AnalysisSpan.id.in_(span_ids)  # type: ignore[arg-type]
            )
            session.exec(stmt_spans)  # type: ignore[arg-type]
        stmt_analysis = delete(PostAnalysis).where(
            PostAnalysis.id.in_(analysis_ids)  # type: ignore[arg-type]
        )
        session.exec(stmt_analysis)  # type: ignore[arg-type]

    session.delete(post)
    session.commit()


def delete_posts_for_campaign(session: Session, campaign_id: str) -> None:
    """Delete all posts for a campaign."""
    posts = list_posts_for_campaign(session, campaign_id)
    for post in posts:
        delete_post(session, post)


def post_with_media(session: Session, post: Post) -> PostOut:
    """Serialize post with media list."""
    media_rows: Sequence[PostMedia] = list(
        session.exec(select(PostMedia).where(PostMedia.post_id == post.id))
    )
    media = [
        Media(
            id=row.id,
            url=row.url,
            type=row.type,
            width=row.width,
            height=row.height,
            size_bytes=row.size_bytes,
        )
        for row in media_rows
    ]
    return PostOut(
        id=post.id,
        campaign_id=post.campaign_id,
        title=post.title,
        caption=post.caption,
        media=media,
        platform=post.platform,
        status=post.status,
        scheduled_at=post.scheduled_at,
        published_at=post.published_at,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )

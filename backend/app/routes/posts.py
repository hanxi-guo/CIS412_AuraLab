"""Post API routes."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session

from ..deps import get_session
from ..models import Campaign
from ..schemas import PostCreate, PostOut, PostUpdate
from ..services import posts as post_service
from ..services import storage

router = APIRouter(prefix="/api", tags=["posts"])


def _get_campaign(session: Session, campaign_id: str) -> Campaign:
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/campaigns/{campaign_id}/posts", response_model=dict)
def list_posts(
    campaign_id: str, session: Session = Depends(get_session)
):
    """List posts for a campaign."""
    _get_campaign(session, campaign_id)
    posts = post_service.list_posts_for_campaign(session, campaign_id)
    return {"posts": [post_service.post_with_media(session, p) for p in posts]}


@router.post("/campaigns/{campaign_id}/posts", response_model=PostOut, status_code=201)
async def create_post(
    campaign_id: str,
    title: Optional[str] = Form(default=""),
    caption: Optional[str] = Form(default=""),
    platform: Optional[str] = Form(default="instagram"),
    status: Optional[str] = Form(default="draft"),
    scheduled_at: Optional[str] = Form(default=None),
    media: List[UploadFile] = File(default_factory=list),
    session: Session = Depends(get_session),
):  # pylint: disable=too-many-arguments,too-many-positional-arguments
    """Create a post with optional media upload."""
    _get_campaign(session, campaign_id)

    media_payload = await storage.save_uploads(campaign_id, media) if media else None
    parsed_scheduled = datetime.fromisoformat(scheduled_at) if scheduled_at else None
    payload = PostCreate(
        title=title or "",
        caption=caption or "",
        platform=platform,
        status=status,
        scheduled_at=parsed_scheduled,
        media=media_payload,
    )
    post = post_service.create_post(session, campaign_id, payload)
    return post_service.post_with_media(session, post)


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(post_id: str, session: Session = Depends(get_session)):
    """Fetch a single post."""
    post = post_service.get_post(session, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post_service.post_with_media(session, post)


@router.put("/posts/{post_id}", response_model=PostOut)
async def update_post(
    post_id: str,
    title: Optional[str] = Form(default=None),
    caption: Optional[str] = Form(default=None),
    platform: Optional[str] = Form(default=None),
    status: Optional[str] = Form(default=None),
    scheduled_at: Optional[str] = Form(default=None),
    published_at: Optional[str] = Form(default=None),
    media: List[UploadFile] = File(default=[]),
    session: Session = Depends(get_session),
):  # pylint: disable=too-many-arguments,too-many-positional-arguments
    """Update post fields."""
    post = post_service.get_post(session, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    media_payload = None
    if media and len(media) > 0 and media[0].filename:
        media_payload = await storage.save_uploads(post.campaign_id, media)

    payload = PostUpdate(
        title=title,
        caption=caption,
        platform=platform,
        status=status,
        scheduled_at=datetime.fromisoformat(scheduled_at) if scheduled_at else None,
        published_at=datetime.fromisoformat(published_at) if published_at else None,
        media=media_payload,
    )
    updated = post_service.update_post(session, post, payload)
    return post_service.post_with_media(session, updated)


@router.delete("/posts/{post_id}", response_model=dict)
def delete_post(post_id: str, session: Session = Depends(get_session)):
    """Delete a post and its media."""
    post = post_service.get_post(session, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post_service.delete_post(session, post)
    return {"deleted": True}

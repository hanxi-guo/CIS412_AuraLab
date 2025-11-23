"""SQLModel tables for campaigns, posts, and media."""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


def default_uuid() -> str:
    """Generate a UUID string for primary keys."""
    return str(uuid4())


class Campaign(SQLModel, table=True):
    """Campaign table."""
    id: str = Field(default_factory=default_uuid, primary_key=True, index=True)
    name: str
    brief_overview: str = ""
    brief_target_audience: str = ""
    brief_guardrails: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class CampaignBrandVoice(SQLModel, table=True):
    """Campaign brand voice tags."""
    id: str = Field(default_factory=default_uuid, primary_key=True)
    campaign_id: str = Field(foreign_key="campaign.id", index=True)
    tag: str = Field(index=True)


class Post(SQLModel, table=True):
    """Post table."""
    id: str = Field(default_factory=default_uuid, primary_key=True, index=True)
    campaign_id: str = Field(foreign_key="campaign.id", index=True)
    title: str = ""
    caption: str = ""
    platform: str = "instagram"
    status: str = "draft"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class PostMedia(SQLModel, table=True):
    """Media attachments for posts."""
    id: str = Field(default_factory=default_uuid, primary_key=True)
    post_id: str = Field(foreign_key="post.id", index=True)
    url: str
    type: str = "image"  # image or video
    width: Optional[int] = None
    height: Optional[int] = None
    size_bytes: Optional[int] = None

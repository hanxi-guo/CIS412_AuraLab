"""Pydantic schemas for campaign/post CRUD shapes."""
# pylint: disable=no-self-argument
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from .config import (
    BRAND_VOICE_MAX,
    BRAND_VOICE_TAG_MAX_LEN,
    BRIEF_MAX,
    CAPTION_MAX,
    CAMPAIGN_NAME_MAX,
    TITLE_MAX,
)


def _trim(text: Optional[str]) -> str:
    """Trim whitespace from strings, defaulting to empty when None."""
    return text.strip() if text else ""


class Brief(BaseModel):
    """Campaign brief fields."""
    overview: str = Field(default="", max_length=BRIEF_MAX)
    target_audience: str = Field(default="", max_length=BRIEF_MAX)
    brand_voice: List[str] = Field(default_factory=list)
    guardrails: str = Field(default="", max_length=BRIEF_MAX)

    @validator("brand_voice")
    def enforce_brand_voice_limits(cls, value: List[str]) -> List[str]:
        """Ensure brand_voice respects uniqueness and length constraints."""
        cleaned = []
        seen = set()
        if len(value) > BRAND_VOICE_MAX:
            raise ValueError(f"brand_voice max {BRAND_VOICE_MAX}")
        for tag in value:
            safe = tag.strip()
            if not safe:
                continue
            if len(safe) > BRAND_VOICE_TAG_MAX_LEN:
                raise ValueError(f"brand_voice tag max {BRAND_VOICE_TAG_MAX_LEN} chars")
            key = safe.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(safe)
        return cleaned

    @validator("overview", "target_audience", "guardrails", pre=True)
    def trim_fields(cls, v: Optional[str]) -> str:
        """Trim whitespace on brief fields."""
        return _trim(v)


class CampaignBase(BaseModel):
    """Common campaign fields."""
    name: str = Field(..., min_length=1, max_length=CAMPAIGN_NAME_MAX)
    brief: Brief = Field(default_factory=Brief)

    @validator("name", pre=True)
    def trim_name(cls, v: str) -> str:
        """Trim whitespace on campaign name."""
        return _trim(v)


class CampaignCreate(CampaignBase):
    """Campaign creation payload."""


class CampaignUpdate(BaseModel):
    """Partial campaign update payload."""
    name: Optional[str] = Field(default=None, max_length=CAMPAIGN_NAME_MAX)
    brief: Optional[Brief] = None

    @validator("name", pre=True)
    def trim_name(cls, v: Optional[str]) -> Optional[str]:
        """Trim whitespace on campaign name."""
        return _trim(v) if v is not None else v


class CampaignOut(CampaignBase):
    """Campaign response."""
    id: str
    created_at: datetime
    updated_at: datetime


class Media(BaseModel):
    """Media attachment DTO."""
    id: str
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
    size_bytes: Optional[int] = None
    type: str  # image or video


class MediaCreate(BaseModel):
    """Media creation payload."""
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
    size_bytes: Optional[int] = None
    type: str = "image"


class PostBase(BaseModel):
    """Shared post fields."""
    title: Optional[str] = Field(default="", max_length=TITLE_MAX)
    caption: Optional[str] = Field(default="", max_length=CAPTION_MAX)
    media: Optional[List[MediaCreate]] = None
    platform: Optional[str] = "instagram"
    status: Optional[str] = "draft"
    scheduled_at: Optional[datetime] = None

    @validator("title", "caption", pre=True)
    def trim_text(cls, v: Optional[str]) -> Optional[str]:
        """Trim whitespace on post title/caption."""
        return _trim(v) if v is not None else v


class PostCreate(PostBase):
    """Post creation payload."""


class PostUpdate(PostBase):
    """Partial post update."""
    published_at: Optional[datetime] = None


class PostOut(BaseModel):
    """Post response."""
    id: str
    campaign_id: str
    title: str
    caption: str
    media: List[Media]
    platform: str
    status: str
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

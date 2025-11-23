"""Campaign CRUD service helpers."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring,no-member
from typing import List, Optional
from datetime import datetime

from sqlmodel import Session, select, delete

from ..config import BRAND_VOICE_MAX
from ..models import Campaign, CampaignBrandVoice
from ..schemas import Brief, CampaignCreate, CampaignOut, CampaignUpdate
from .posts import delete_posts_for_campaign


def _apply_brief(session: Session, campaign: Campaign, brief: Brief) -> None:
    """Apply brief fields and replace brand voice tags."""
    campaign.brief_overview = brief.overview
    campaign.brief_target_audience = brief.target_audience
    campaign.brief_guardrails = brief.guardrails

    # Replace brand voice tags
    stmt = delete(CampaignBrandVoice).where(
        CampaignBrandVoice.campaign_id == campaign.id # type: ignore[arg-type]
    )
    session.exec(stmt)  # type: ignore[arg-type]
    existing = set()
    for tag in brief.brand_voice[:BRAND_VOICE_MAX]:
        lowered = tag.lower()
        if lowered in existing:
            continue
        existing.add(lowered)
        session.add(CampaignBrandVoice(campaign_id=campaign.id, tag=lowered))


def create_campaign(session: Session, payload: CampaignCreate) -> Campaign:
    """Create a campaign and brand voice tags."""
    campaign = Campaign(name=payload.name)
    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    _apply_brief(session, campaign, payload.brief)
    session.commit()
    session.refresh(campaign)
    return campaign


def get_campaign(session: Session, campaign_id: str) -> Optional[Campaign]:
    """Fetch a campaign by id."""
    return session.get(Campaign, campaign_id)


def list_campaigns(
    session: Session, search: Optional[str] = None
) -> List[Campaign]:
    """List campaigns, optionally filtered by name."""
    statement = select(Campaign)
    if search:
        term = f"%{search.lower()}%"
        statement = statement.where(
            Campaign.name.ilike(term)
        )  # type: ignore[attr-defined]
    return list(
        session.exec(statement.order_by(Campaign.created_at.desc()))
    )  # type: ignore[attr-defined]


def update_campaign(
    session: Session, campaign: Campaign, payload: CampaignUpdate
) -> Campaign:
    """Update campaign fields."""
    if payload.name is not None:
        campaign.name = payload.name
    if payload.brief is not None:
        _apply_brief(session, campaign, payload.brief)
    campaign.updated_at = datetime.utcnow()
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


def delete_campaign(session: Session, campaign: Campaign) -> None:
    """Delete a campaign and cascade posts/media."""
    delete_posts_for_campaign(session, campaign.id)
    session.delete(campaign)
    session.commit()


def campaign_out(session: Session, campaign: Campaign) -> CampaignOut:
    """Serialize campaign with brief and tags."""
    tags = list(
        session.exec(
            select(CampaignBrandVoice.tag).where(CampaignBrandVoice.campaign_id == campaign.id)
        )
    )
    return CampaignOut(
        id=campaign.id,
        name=campaign.name,
        brief=Brief(
            overview=campaign.brief_overview,
            target_audience=campaign.brief_target_audience,
            guardrails=campaign.brief_guardrails,
            brand_voice=tags,
        ),
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )

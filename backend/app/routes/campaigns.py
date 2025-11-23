"""Campaign API routes."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from ..deps import get_session
from ..schemas import CampaignCreate, CampaignOut, CampaignUpdate
from ..services import campaigns as campaign_service
from ..services import posts as post_service

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("", response_model=dict)
def list_campaigns(
        search: Optional[str] = Query(default=None),
        include: Optional[str] = Query(default=None),
        session: Session = Depends(get_session),
):
    """List campaigns, optionally including posts."""
    campaigns = campaign_service.list_campaigns(session, search=search)
    payload: List[dict] = []
    include_posts = include == "posts"
    for c in campaigns:
        camp_out = campaign_service.campaign_out(session, c)
        item: dict = camp_out.dict()
        if include_posts:
            posts = post_service.list_posts_for_campaign(session, c.id)
            item["posts"] = [post_service.post_with_media(session, p) for p in posts]
        payload.append(item)
    return {"campaigns": payload}


@router.post("", response_model=CampaignOut, status_code=201)
def create_campaign(
        payload: CampaignCreate, session: Session = Depends(get_session)
):
    """Create a new campaign."""
    campaign = campaign_service.create_campaign(session, payload)
    return campaign_service.campaign_out(session, campaign)


@router.get("/{campaign_id}", response_model=dict)
def get_campaign(
        campaign_id: str,
        include: Optional[str] = Query(default=None),
        session: Session = Depends(get_session),
):
    """Fetch a campaign, optionally including posts."""
    campaign = campaign_service.get_campaign(session, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data: dict = campaign_service.campaign_out(session, campaign).dict()
    if include == "posts":
        posts = post_service.list_posts_for_campaign(session, campaign_id)
        data["posts"] = [post_service.post_with_media(session, p) for p in posts]
    return data


@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
        campaign_id: str,
        payload: CampaignUpdate,
        session: Session = Depends(get_session),
):
    """Update campaign fields."""
    campaign = campaign_service.get_campaign(session, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign = campaign_service.update_campaign(session, campaign, payload)
    return campaign_service.campaign_out(session, campaign)


@router.delete("/{campaign_id}", response_model=dict)
def delete_campaign(
        campaign_id: str, session: Session = Depends(get_session)
):
    """Delete a campaign and its posts/media."""
    campaign = campaign_service.get_campaign(session, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign_service.delete_campaign(session, campaign)
    return {"deleted": True}

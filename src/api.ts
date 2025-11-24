import type { AnalysisSpan, Campaign, CampaignBrief, Post } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

interface DraftAnalysisPayload {
  title?: string;
  caption: string;
  platform?: string;
  campaignContext?: {
    overview?: string;
    target_audience?: string;
    brand_voice?: string[];
    guardrails?: string;
  };
}

interface DraftAnalysisResponse {
  analysis_id: string;
  status: string;
  spans: AnalysisSpan[];
  post_updated_after_snapshot: boolean;
}

export async function runDraftAnalysis(
  payload: DraftAnalysisPayload
): Promise<DraftAnalysisResponse> {
  const res = await fetch(`${API_BASE}/analysis/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
      caption: payload.caption,
      platform: payload.platform,
      campaign_context: payload.campaignContext,
    }),
  });

  if (!res.ok) {
    throw new Error(`Analysis request failed (${res.status})`);
  }

  return res.json();
}

interface ApiCampaign {
  id: string;
  name: string;
  brief?: {
    overview?: string;
    target_audience?: string;
    brand_voice?: string[];
    guardrails?: string;
  };
  posts?: ApiPost[];
}

interface ApiPost {
  id: string;
  campaign_id: string;
  title?: string;
  caption?: string;
  media?: Array<{ url: string }>;
}

const mapBrief = (brief: ApiCampaign['brief']): CampaignBrief => ({
  overview: brief?.overview ?? '',
  targetAudience: brief?.target_audience ?? '',
  brandVoice: brief?.brand_voice ?? [],
  guardrails: brief?.guardrails ?? '',
});

const mapPost = (post: ApiPost): Post => ({
  id: post.id,
  title: post.title ?? '',
  caption: post.caption ?? '',
  images: (post.media ?? []).map((m) => m.url),
});

const mapCampaign = (apiCampaign: ApiCampaign): Campaign => ({
  id: apiCampaign.id,
  name: apiCampaign.name,
  brief: mapBrief(apiCampaign.brief),
  posts: (apiCampaign.posts ?? []).map(mapPost).reverse(),
});

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail || 'request failed'}`);
  }
  return res.json();
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const data = await jsonFetch<{ campaigns: ApiCampaign[] }>(
    `${API_BASE}/campaigns?include=posts`
  );
  return data.campaigns.map(mapCampaign);
}

export async function createCampaign(name: string): Promise<Campaign> {
  const payload = { name, brief: {} };
  const data = await jsonFetch<ApiCampaign>(`${API_BASE}/campaigns`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapCampaign(data);
}

export async function updateCampaign(
  id: string,
  updates: Partial<CampaignBrief> & { name?: string }
): Promise<Campaign> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (
    updates.overview !== undefined ||
    updates.targetAudience !== undefined ||
    updates.brandVoice !== undefined ||
    updates.guardrails !== undefined
  ) {
    payload.brief = {
      overview: updates.overview,
      target_audience: updates.targetAudience,
      brand_voice: updates.brandVoice,
      guardrails: updates.guardrails,
    };
  }
  const data = await jsonFetch<ApiCampaign>(`${API_BASE}/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapCampaign(data);
}

export async function deleteCampaign(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE' });
}

interface PostPayload {
  title?: string;
  caption?: string;
  platform?: string;
  status?: string;
}

export async function createPost(
  campaignId: string,
  payload: PostPayload
): Promise<Post> {
  const form = new FormData();
  if (payload.title !== undefined) form.append('title', payload.title);
  if (payload.caption !== undefined) form.append('caption', payload.caption);
  if (payload.platform !== undefined) form.append('platform', payload.platform);
  if (payload.status !== undefined) form.append('status', payload.status);

  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/posts`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail || 'request failed'}`);
  }
  const data: ApiPost = await res.json();
  return mapPost(data);
}

export async function updatePost(id: string, payload: PostPayload): Promise<Post> {
  const data = await jsonFetch<ApiPost>(`${API_BASE}/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapPost(data);
}

export async function deletePost(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/posts/${id}`, { method: 'DELETE' });
}

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
  payload: DraftAnalysisPayload,
  signal?: AbortSignal
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
    signal,
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

const mapPost = (post: ApiPost): Post => {
  const baseUrl = API_BASE.replace('/api', '');
  console.log('🔗 [API] mapPost called for post:', post.id);
  console.log('🔗 [API] Base URL:', baseUrl);
  console.log('🔗 [API] Raw media from API:', post.media);
  
  const mappedImages = (post.media ?? [])
    .filter((m) => {
      // Validate that media object has a url property
      if (!m || !m.url) {
        console.error('❌ [API] Invalid media object (missing url):', m);
        return false;
      }
      // Check if it's just an ID (UUID pattern) instead of a URL
      const isJustId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.url);
      if (isJustId) {
        console.error(`❌ [API] Media url is just an ID, not a path: "${m.url}"`);
        return false;
      }
      return true;
    })
    .map((m) => {
      const finalUrl = m.url.startsWith('/') ? `${baseUrl}${m.url}` : m.url;
      console.log(`🔗 [API] Mapping media: "${m.url}" → "${finalUrl}"`);
      return finalUrl;
    });
  
  console.log('🔗 [API] Final mapped images:', mappedImages);
  
  return {
    id: post.id,
    title: post.title ?? '',
    caption: post.caption ?? '',
    images: mappedImages,
  };
};

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
  files?: File[];
}

export async function createPost(
  campaignId: string,
  payload: PostPayload
): Promise<Post> {
  console.log('📤 [API] createPost called');
  console.log('📤 [API] Campaign ID:', campaignId);
  console.log('📤 [API] Payload:', { 
    title: payload.title, 
    caption: payload.caption?.slice(0, 50) + '...',
    filesCount: payload.files?.length || 0 
  });
  
  const form = new FormData();
  if (payload.title !== undefined) form.append('title', payload.title);
  if (payload.caption !== undefined) form.append('caption', payload.caption);
  if (payload.platform !== undefined) form.append('platform', payload.platform);
  if (payload.status !== undefined) form.append('status', payload.status);

  if (payload.files && payload.files.length > 0) {
    console.log('📤 [API] Uploading files:');
    payload.files.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.name} (${file.size} bytes, ${file.type})`);
      form.append('media', file);
    });
  }

  const url = `${API_BASE}/campaigns/${campaignId}/posts`;
  console.log('📤 [API] POSTing to:', url);
  
  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });
  
  console.log('📤 [API] Response status:', res.status, res.statusText);
  
  if (!res.ok) {
    const detail = await res.text();
    console.error('❌ [API] Create post failed:', detail);
    throw new Error(`${res.status} ${res.statusText}: ${detail || 'request failed'}`);
  }
  
  const data: ApiPost = await res.json();
  console.log('📤 [API] Response data:', data);
  
  const mappedPost = mapPost(data);
  console.log('📤 [API] Mapped post:', mappedPost);
  
  return mappedPost;
}

export async function updatePost(id: string, payload: PostPayload): Promise<Post> {
  const form = new FormData();
  if (payload.title !== undefined) form.append('title', payload.title);
  if (payload.caption !== undefined) form.append('caption', payload.caption);
  if (payload.platform !== undefined) form.append('platform', payload.platform);
  if (payload.status !== undefined) form.append('status', payload.status);

  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((file) => {
      form.append('media', file);
    });
  }

  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'PUT',
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail || 'request failed'}`);
  }
  const data: ApiPost = await res.json();
  return mapPost(data);
}

export async function deletePost(id: string): Promise<void> {
  await jsonFetch(`${API_BASE}/posts/${id}`, { method: 'DELETE' });
}

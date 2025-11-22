import type { Campaign, ThemeConfig } from './types';

// Limits & config (easy to share with backend later if needed)
export const MAX_CAMPAIGN_NAME_LENGTH = 50;
export const MAX_TITLE_LENGTH = 40;
export const MAX_CAPTION_LENGTH = 500;
export const MAX_BRIEF_LENGTH = 800;
export const MAX_IMAGES_PER_POST = 10;
export const MAX_BRAND_VOICE_TAGS = 8;

export const THEME: ThemeConfig = {
  bg: 'bg-[#EBE7DE]',
  sidebar: 'bg-[#DED9CD]',
  card: 'bg-[#F4F1EA]',
  accent: 'bg-[#C27A70]',
  accentHover: 'hover:bg-[#A6655C]',
  textMain: 'text-[#4A4238]',
  textSec: 'text-[#8C857B]',
  border: 'border-[#D1CBC1]',
  inputBg: 'bg-[#FDFCF8]',
};

export const INITIAL_CAMPAIGNS: Campaign[] = [
    {
      id: 'scenery',
      name: 'Scenery Campaign',
      posts: [],
      brief: {
        overview:
          'Launch a limited series of hand-painted seaside canvases that feel like a quiet, golden-hour escape from the city.',
        targetAudience:
          'Young professionals and creatives (25–40) living in coastal or major urban areas who want calming, artful pieces for their apartments or home offices.',
        brandVoice: ['warm', 'intimate', 'artisanal', 'tranquil'],
        guardrails:
          'Do not mention prices or discounts • Avoid sounding mass-produced or generic • No overly salesy language—focus on feeling and mood • Keep captions positive and hopeful.',
      },
    },
    {
      id: 'shoe',
      name: 'Shoe Campaign',
      posts: [],
      brief: {
        overview: '',
        targetAudience: '',
        brandVoice: [],
        guardrails: '',
      },
    },
    {
      id: 'personal',
      name: 'Personal Posts',
      posts: [],
      brief: {
        overview: '',
        targetAudience: '',
        brandVoice: [],
        guardrails: '',
      },
    },
  ];
  

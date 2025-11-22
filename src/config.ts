import type { Campaign, ThemeConfig } from './types';

// Limits & config (easy to share with backend later if needed)
export const MAX_CAMPAIGN_NAME_LENGTH = 50;
export const MAX_TITLE_LENGTH = 40;
export const MAX_CAPTION_LENGTH = 500;
export const MAX_BRIEF_LENGTH = 800;
export const MAX_IMAGES_PER_POST = 10;
export const MAX_REFERENCES_PER_CAMPAIGN = 5;

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
  posts: [
    {
      id: 1,
      title: 'Golden hour by the bay',
      caption:
        'Soft waves, warm light, and hand-painted details that make this seaside print feel like a memory.',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      ],
    },
  ],
  references: [],
  brief:
    'This campaign markets a series of seaside scenery paintings. Highlight the beauty of the artwork and the hand-made quality. Do not mention price in any posts.',
  },
  {
    id: 'shoe',
    name: 'Shoe Campaign',
    posts: [],
    references: [],
    brief: '',
  },
  {
    id: 'personal',
    name: 'Personal Posts',
    posts: [],
    references: [],
    brief: '',
  },
];

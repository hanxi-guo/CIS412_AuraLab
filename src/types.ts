// Shared domain types

export interface Post {
    id: number;
    title: string;
    images: string[];
    caption?: string;
  }
  
  export interface PostDraft {
    title: string;
    text: string;
    images: string[];
    files: File[];
  }
  
  export interface ReferenceFile {
    id: string;
    name: string;
    size: number;
    type: string;
  }
  
  export interface ThemeConfig {
    bg: string;
    sidebar: string;
    card: string;
    accent: string;
    accentHover: string;
    textMain: string;
    textSec: string;
    border: string;
    inputBg: string;
  }
  
  export type TabType = 'preview' | 'analysis';
  
  export interface CampaignBrief {
    overview: string;        // High-level description / objective
    targetAudience: string;  // Who we’re talking to
    brandVoice: string[];    // Tag-style labels: “warm”, “intimate”, etc.
    guardrails: string;      // Do’s / don’ts, constraints
  }
  
  export interface Campaign {
    id: string;
    name: string;
    posts: Post[];
    brief: CampaignBrief;
  }
  
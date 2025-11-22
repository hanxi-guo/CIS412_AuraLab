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
  
  export interface Campaign {
    id: string;
    name: string;
    posts: Post[];
    references: ReferenceFile[];
    brief?: string;
  }
  
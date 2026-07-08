export interface Folder {
  id: string;
  name: string;
  type: 'note' | 'diary';
  order: number;
}

export interface Note {
  id: string;
  folderId?: string | null;
  title: string;
  content: string;
  updatedAt: number;
  order: number;
}

export interface Diary {
  id: string;
  folderId?: string | null;
  date: string; // YYYY-MM-DD
  content: string;
  mood: string;
  weather: string;
  updatedAt: number;
  order: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  updatedAt: number;
  isVolume?: boolean;
}

export interface DocItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  lastOpenedAt?: number;
  chapters: Chapter[];
  drafts?: Chapter[];
  outlines?: DocItem[];
  settings?: DocItem[];
  lastReadChapterId?: string;
  lastReadPage?: number;
  updatedAt: number;
}

export interface AppSettings {
  bringToFrontOnEdit: boolean;
  immersiveBgColor?: string;
  immersiveTextColor?: string;
  showWritingStats?: boolean;
  theme?: 'light' | 'dark';
  readerFontSize?: number;
}


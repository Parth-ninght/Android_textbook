import { AppSettings, Book, Chapter, DocItem } from '../../types';

export interface WriterProps {
  setIsEditing: (val: boolean) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  isActiveTab?: boolean;
}

export type DocItemType = 'outlines' | 'settings' | 'characters';
export type BookTabType = 'chapters' | 'drafts' | 'outlines' | 'settings' | 'characters';
export type SearchSortMode = 'comprehensive' | 'most_mentioned' | 'chapter_order';

export interface ReaderSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  mode?: 'h-flip' | 'v-scroll';
}

export interface StatsModalData {
  words: number;
  minutes: number;
  speed: number;
}

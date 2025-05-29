/** @format */

export interface Chapter {
  id: string;
  title: string;
  description: string;
  url: string;
  content?: string;
  media?: Media[];
  isLoading?: boolean;
  error?: string;
}

export interface Media {
  type: 'image' | 'video' | 'table';
  url?: string;
  content?: string;
  alt?: string;
}

export interface BookCover {
  id: string;
  type: 'upload' | 'template' | 'generated';
  url: string;
  name?: string;
}

export interface Book {
  title: string;
  author: string;
  chapters: Chapter[];
  coverImage: BookCover | null;
  format: 'PDF' | 'EPUB';
}

export type StepType =
  | 'articles'
  | 'chapters'
  | 'cover'
  | 'preview'
  | 'publish';

export interface SessionState {
  book: Book;
  coversGenerated: number;
  cachedCovers: BookCover[];
  currentStep: StepType;
}

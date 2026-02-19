
export enum Strictness {
  LENIENT = 'lenient',
  MEDIUM = 'medium',
  STRICT = 'strict'
}

export interface TextBlock {
  id: string;
  documentId: string;
  text: string;
  orderIndex: number;
  act?: string;
  scene?: string;
}

export interface CueCard {
  id: string;
  documentId: string;
  textBlockId: string;
  cueWord: string;
  expectedText: string;
  strictness: Strictness;
  keywords: string[];
}

export interface ReviewStat {
  cueCardId: string;
  lastScore: number;
  streak: number;
  lastReviewedAt: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  importedAt: number;
  language: string;
  blocks: TextBlock[];
}

export interface Note {
  id: string;
  documentId: string;
  textBlockId?: string;
  cueCardId?: string;
  content: string;
  createdAt: number;
}


export enum VoiceName {
  KORE = 'Kore',
  PUCK = 'Puck',
  CHARON = 'Charon',
  FENRIR = 'Fenrir',
  ZEPHYR = 'Zephyr'
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  description: string;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface AudioPart {
  id: string;
  url: string;
  label: string;
  lastTimestamp?: number;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  audioParts?: AudioPart[];
  progress?: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface SavedBook {
  id: string;
  userId: string;
  title: string;
  pdfBase64: string;
  chapters: Chapter[];
  createdAt: number;
}

export type ProcessingStatus = 'idle' | 'analyzing' | 'ready' | 'error';

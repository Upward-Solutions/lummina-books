import { Chapter } from '../types';

export interface TranslatorService {
    identifyChapters(pdfBase64: string): Promise<Chapter[]>;
    translateChapter(pdfBase64: string, chapter: Chapter, targetLanguage: string): Promise<string>;
}

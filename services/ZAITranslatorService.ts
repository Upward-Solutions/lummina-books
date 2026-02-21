import {TranslatorService} from "@/services/TranslatorService.ts";
import {Chapter} from "@/types.ts";
import {extractPdfText} from './pdfExtractor';

// Configuración básica (idealmente estas variables deberían estar en variables de entorno)
const API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const API_KEY = process.env.ZAI_API_KEY;
const MODEL = 'glm-5';

export class ZAITranslatorService implements TranslatorService {
    private async callLLM(systemPrompt: string, userMessage: string): Promise<string> {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error en la API: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async identifyChapters(pdfBase64: string): Promise<Chapter[]> {
        const fullText = await extractPdfText(pdfBase64);

        const systemPrompt =
            'You are an expert structural analyzer for books. ' +
            'Your goal is to map the book\'s narrative structure. ' +
            'Capture every meaningful part written by the author (Preface, Foreword, Introduction, Chapters, Epilogue, Acknowledgments, Appendices) ' +
            'but exclude utility sections like the Index or Table of Contents. ' +
            'Output ONLY valid JSON — no markdown, no explanation.';

        const userMessage =
            'Analyze the following book text and return a JSON array. ' +
            'Each element must have exactly these fields: "id" (a slug like "chapter-1"), "title" (the section title), "summary" (one sentence). ' +
            'IMPORTANT: Start your response directly with [ and end with ]. No prose before or after.\n\n' +
            fullText;

        try {
            const rawResponse = await this.callLLM(systemPrompt, userMessage);
            const cleanJson = rawResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("Error identificando capítulos:", error);
            return [];
        }
    }

    async translateChapter(pdfBase64: string, chapter: Chapter, targetLanguage: string): Promise<string> {
        const fullText = await extractPdfText(pdfBase64);

        const systemPrompt =
            `You are a professional literary translator. Translate the text into ${targetLanguage}. ` +
            `Preserve the original tone, style, and nuance of the author.`;

        const userMessage =
            `Translate ONLY the section titled "${chapter.title}" from the text provided below. ` +
            `Ignore the rest of the text. Output only the translated content for this section.\n\n` +
            `Text to process:\n${fullText}`;

        try {
            return await this.callLLM(systemPrompt, userMessage);
        } catch (error) {
            console.error("Error traduciendo capítulo:", error);
            return "";
        }
    }
}
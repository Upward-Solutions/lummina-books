import { Chapter } from '../types';
import { TranslatorService } from './TranslatorService';
import { extractPdfText } from './pdfExtractor';

const OLLAMA_BASE_URL = 'https://ollama-testing.up.railway.app/';
const MODEL = 'gemma3:12b';

// Characters to send to the model per request — stays within context window
// while keeping latency reasonable for a local model.
const MAX_CONTEXT_CHARS = 80_000;

async function ollamaChat(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            stream: false,
            options: {
                temperature: 0.2, // low temperature for faithful translation
                num_ctx: 40960,   // Increase context window to ~40k tokens (default is 2k/4k)
                num_predict: -1,  // Generate until end (unlimited)
            },
        }),
    });

    if (!response.ok) {
        const err = await response.text().catch(() => response.statusText);
        throw new Error(`Ollama error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Ollama returned an empty response.');
    return content.trim();
}

/**
 * Strips markdown code fences so JSON.parse doesn't choke on ```json ... ```
 */
function stripCodeFences(text: string): string {
    return text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
}

export class OllamaTranslatorService implements TranslatorService {
    async identifyChapters(pdfBase64: string): Promise<Chapter[]> {
        const fullText = await extractPdfText(pdfBase64);
        // Trim to avoid exceeding context limit
        const trimmedText = fullText.substring(0, MAX_CONTEXT_CHARS);

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
            trimmedText;

        const raw = await ollamaChat(systemPrompt, userMessage);
        const clean = stripCodeFences(raw);

        try {
            return JSON.parse(clean);
        } catch (e) {
            console.error('OllamaTranslatorService: failed to parse chapter JSON', e, '\nRaw:\n', raw);
            throw new Error('Gemma 3 could not identify the book structure. Try again.');
        }
    }

    async translateChapter(pdfBase64: string, chapter: Chapter, targetLanguage: string): Promise<string> {
        const fullText = await extractPdfText(pdfBase64);
        const trimmedText = fullText.substring(0, MAX_CONTEXT_CHARS);

        const systemPrompt =
            'You are a professional audiobook narrator and translator. ' +
            'You extract and faithfully translate text sections without summarizing, adding commentary, or including any introduction or closing phrases.';

        const userMessage =
            `From the book text below, locate the section titled "${chapter.title}". ` +
            `Extract its full text and translate it faithfully into ${targetLanguage}. ` +
            `Do NOT summarize. Translate every sentence. Output ONLY the translated text.\n\n` +
            trimmedText;

        return ollamaChat(systemPrompt, userMessage);
    }
}

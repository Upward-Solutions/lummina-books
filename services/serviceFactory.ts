import {TranslatorService} from "./TranslatorService";
import {TTSService} from "./TTSService";
import {GeminiTTSService} from "./geminiService";
import {ZAITranslatorService} from "@/services/ZAITranslatorService.ts";
// import { OllamaTranslatorService } from "./OllamaTranslatorService";
//import { GeminiTranslatorService } from "./geminiService";
//import { KokoroTTSService } from "./KokoroTTSService";

export const translatorService: TranslatorService = new ZAITranslatorService();
export const ttsService: TTSService = new GeminiTTSService();


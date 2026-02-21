import {TranslatorService} from "./TranslatorService";
import {TTSService} from "./TTSService";
import {GeminiTTSService} from "./geminiService";
import { OllamaTranslatorService } from "./OllamaTranslatorService";
// import {ZAITranslatorService} from "@/services/ZAITranslatorService.ts";
//import { GeminiTranslatorService } from "./geminiService";
//import { KokoroTTSService } from "./KokoroTTSService";

export const translatorService: TranslatorService = new OllamaTranslatorService();
export const ttsService: TTSService = new GeminiTTSService();


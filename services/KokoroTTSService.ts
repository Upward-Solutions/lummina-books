import { TTSService } from "./TTSService";
import { AudioPart } from "../types";

const KOKORO_BASE_URL = "http://localhost:8880";

export class KokoroTTSService implements TTSService {
    async synthesize(text: string, voice: string, partId: string, partLabel: string): Promise<AudioPart> {
        const response = await fetch(`${KOKORO_BASE_URL}/v1/audio/speech`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "kokoro",
                input: text,
                voice: voice,
                response_format: "wav",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`Kokoro TTS error (${response.status}): ${errorText}`);
        }

        const audioBlob = await response.blob();
        return {
            id: partId,
            url: URL.createObjectURL(audioBlob),
            label: partLabel,
        };
    }
}

import { AudioPart } from '../types';

export interface TTSService {
    synthesize(text: string, voice: string, partId: string, partLabel: string): Promise<AudioPart>;
}

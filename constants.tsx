
import { VoiceName, VoiceOption, LanguageOption } from './types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
];

export const VOICES: VoiceOption[] = [
  { id: VoiceName.KORE, name: 'Kore', description: 'Deep and professional' },
  { id: VoiceName.PUCK, name: 'Puck', description: 'Energetic and youthful' },
  { id: VoiceName.CHARON, name: 'Charon', description: 'Calm and wise' },
  { id: VoiceName.FENRIR, name: 'Fenrir', description: 'Bold and authoritative' },
  { id: VoiceName.ZEPHYR, name: 'Zephyr', description: 'Light and friendly' },
];

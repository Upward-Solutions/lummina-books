
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { VoiceName, Chapter, AudioPart } from "../types";

// Utility to decode base64 to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom PCM decoder for raw audio bytes
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Convert AudioBuffer to a playable WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let offset = 0;
  let pos = 0;

  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };
  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}

export const identifyChapters = async (pdfBase64: string): Promise<Chapter[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: "Locate and identify ALL distinct narrative sections written by the author. This includes Preface, Foreword, Introduction, every Chapter, the Epilogue, Acknowledgments, and any Appendices. IMPORTANT: DO NOT include the Table of Contents or Index as a playable section. Return a JSON array with 'id', 'title', and a one-sentence 'summary' for each identified section." }
      ]
    },
    config: {
      systemInstruction: "You are an expert structural analyzer for digital books. Your goal is to map the book's narrative structure. Capture every meaningful part of the book written by the author but exclude utility sections like the Index or Table of Contents. Output ONLY valid JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["id", "title", "summary"]
        }
      }
    }
  });

  const responseText = response.text;
  if (!responseText) throw new Error("Could not parse AI response.");

  try {
    return JSON.parse(responseText.trim());
  } catch (e) {
    console.error("Failed to parse chapters", e);
    throw new Error("Could not identify book structure.");
  }
};

/**
 * Splits text into chunks of roughly maxChars, attempting to split at paragraph breaks.
 */
function splitTextIntoChunks(text: string, maxChars: number = 5000): string[] {
  if (text.length <= maxChars) return [text];
  
  const chunks: string[] = [];
  let remainingText = text;
  
  while (remainingText.length > 0) {
    if (remainingText.length <= maxChars) {
      chunks.push(remainingText);
      break;
    }
    
    let splitIndex = remainingText.lastIndexOf('\n\n', maxChars);
    if (splitIndex === -1) splitIndex = remainingText.lastIndexOf('\n', maxChars);
    if (splitIndex === -1) splitIndex = remainingText.lastIndexOf('. ', maxChars);
    if (splitIndex === -1) splitIndex = maxChars;
    
    chunks.push(remainingText.substring(0, splitIndex).trim());
    remainingText = remainingText.substring(splitIndex).trim();
  }
  
  return chunks;
}

export const synthesizeChapter = async (
  pdfBase64: string,
  chapter: Chapter,
  targetLanguage: string,
  voice: VoiceName,
  onProgress?: (percent: number) => void
): Promise<AudioPart[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Extract and Translate full text of the section
  onProgress?.(5);
  const textResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        { text: `Extract and translate the literal text of the section titled: "${chapter.title}" into ${targetLanguage}. Faithfully translate every word without summarizing.` }
      ]
    },
    config: {
      systemInstruction: "You are a direct audiobook narrator and translator. You extract text exactly as written in the source document and translate it faithfully. NO intro/outro model phrases."
    }
  });

  const fullText = textResponse.text?.trim();
  if (!fullText) throw new Error("Could not extract section text.");

  // 2. Chunk text to avoid synthesis limits
  const chunks = splitTextIntoChunks(fullText);
  const audioParts: AudioPart[] = [];
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

  for (let i = 0; i < chunks.length; i++) {
    const startProgress = 10 + (i / chunks.length) * 85;
    const endProgress = 10 + ((i + 1) / chunks.length) * 85;
    
    onProgress?.(Math.round(startProgress));

    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: chunks[i] }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const pcmData = decode(base64Audio);
      const audioBuffer = await decodeAudioData(pcmData, audioContext, 24000, 1);
      const wavBlob = audioBufferToWav(audioBuffer);
      audioParts.push({
        id: `${chapter.id}-part-${i}`,
        url: URL.createObjectURL(wavBlob),
        label: chunks.length > 1 ? `Parte ${i + 1}` : 'Audio Completo'
      });
    }
    
    onProgress?.(Math.round(endProgress));
  }

  onProgress?.(100);
  return audioParts;
};

import React from 'react';
import { Chapter, VoiceName } from '../types';
import { SUPPORTED_LANGUAGES, VOICES } from '../constants';
import FileUploader from './FileUploader';
import ChaptersPanel from './ChaptersPanel';

const BookWorkspace: React.FC<{
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  targetLang: string;
  onTargetLangChange: (value: string) => void;
  selectedVoice: VoiceName;
  onSelectedVoiceChange: (value: VoiceName) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  chapters: Chapter[];
  expandedChapterId: string | null;
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
  onToggleChapter: (id: string) => void;
  onGenerateChapter: (id: string) => void;
  onUpdatePartTimestamp: (chapterId: string, partId: string, timestamp: number) => void;
}> = ({
  selectedFile,
  onFileSelect,
  targetLang,
  onTargetLangChange,
  selectedVoice,
  onSelectedVoiceChange,
  onAnalyze,
  isAnalyzing,
  chapters,
  expandedChapterId,
  playbackRate,
  onSetPlaybackRate,
  onToggleChapter,
  onGenerateChapter,
  onUpdatePartTimestamp,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <FileUploader onFileSelect={onFileSelect} selectedFile={selectedFile} />
          <div className="mt-6 space-y-4">
            <select
              value={targetLang}
              onChange={(e) => onTargetLangChange(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              value={selectedVoice}
              onChange={(e) => onSelectedVoiceChange(e.target.value as VoiceName)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} - {v.description}
                </option>
              ))}
            </select>
            <button
              onClick={onAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className={`w-full py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 ${selectedFile && !isAnalyzing ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-100' : 'bg-gray-100 text-gray-400'}`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Process Book'}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <ChaptersPanel
          chapters={chapters}
          expandedChapterId={expandedChapterId}
          playbackRate={playbackRate}
          onSetPlaybackRate={onSetPlaybackRate}
          onToggleChapter={onToggleChapter}
          onGenerateChapter={onGenerateChapter}
          onUpdatePartTimestamp={onUpdatePartTimestamp}
        />
      </div>
    </div>
  );
};

export default BookWorkspace;

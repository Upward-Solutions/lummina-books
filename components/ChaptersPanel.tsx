import React from 'react';
import { Chapter } from '../types';
import AudioPlayer from './AudioPlayer';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const ChaptersPanel: React.FC<{
  chapters: Chapter[];
  expandedChapterId: string | null;
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
  onToggleChapter: (id: string) => void;
  onGenerateChapter: (id: string) => void;
  onUpdatePartTimestamp: (chapterId: string, partId: string, timestamp: number) => void;
}> = ({
  chapters,
  expandedChapterId,
  playbackRate,
  onSetPlaybackRate,
  onToggleChapter,
  onGenerateChapter,
  onUpdatePartTimestamp,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[600px]">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif font-bold text-gray-900">Chapters & Sections</h2>
        {chapters.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            {PLAYBACK_SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSetPlaybackRate(s)}
                className={`text-xs font-bold w-9 h-7 rounded transition-all ${playbackRate === s ? 'bg-amber-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="text-lg font-serif italic">Your digital shelf awaits...</p>
          </div>
        ) : (
          chapters.map((chapter, index) => {
            const isExpanded = expandedChapterId === chapter.id;
            return (
              <div
                key={chapter.id}
                className={`border rounded-xl transition-all overflow-hidden ${isExpanded ? 'border-indigo-300 shadow-md ring-1 ring-indigo-50' : 'border-gray-100 hover:border-gray-300'}`}
              >
                <div
                  onClick={() => onToggleChapter(chapter.id)}
                  className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/20' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h3 className={`font-bold transition-colors ${isExpanded ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {chapter.title}
                      </h3>
                      {!isExpanded && <p className="text-xs text-gray-400 line-clamp-1">{chapter.summary}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {chapter.audioParts && chapter.audioParts.length > 0 && !isExpanded && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                        Ready
                      </span>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-indigo-100/50 animate-fade-in">
                    <div className="flex items-start justify-between gap-6 mb-6 mt-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 leading-relaxed">{chapter.summary}</p>
                      </div>
                      <div className="shrink-0">
                        {chapter.status !== 'processing' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateChapter(chapter.id);
                            }}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${chapter.audioParts?.length ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                          >
                            {chapter.audioParts?.length ? 'Regenerate Audio' : 'Start Narration'}
                          </button>
                        ) : (
                          <div className="text-right">
                            <div className="text-[10px] font-black text-indigo-600 mb-1">SYNTHESIZING {chapter.progress}%</div>
                            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${chapter.progress}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {chapter.audioParts && chapter.audioParts.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        {chapter.audioParts.map((part) => (
                          <div
                            key={part.id}
                            className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 hover:border-indigo-100 transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                                {part.label}
                              </span>
                              {part.lastTimestamp && part.lastTimestamp > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  {Math.floor(part.lastTimestamp / 60)}:{Math.floor(part.lastTimestamp % 60)
                                    .toString()
                                    .padStart(2, '0')}
                                </div>
                              )}
                            </div>
                            <AudioPlayer
                              url={part.url}
                              rate={playbackRate}
                              initialTime={part.lastTimestamp}
                              onTimeUpdate={(t) => onUpdatePartTimestamp(chapter.id, part.id, t)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChaptersPanel;

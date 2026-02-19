import React, { useEffect, useRef, useState } from 'react';

const AudioPlayer: React.FC<{
  url: string;
  rate: number;
  initialTime?: number;
  onTimeUpdate: (t: number) => void;
}> = ({ url, rate, initialTime, onTimeUpdate }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);

  const handleMetadata = () => {
    if (ref.current && initialTime && !ready) {
      ref.current.currentTime = initialTime;
      setReady(true);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={ref}
        src={url}
        controls
        className="w-full h-8 custom-audio-mini"
        onLoadedMetadata={handleMetadata}
        onTimeUpdate={() => ref.current && onTimeUpdate(ref.current.currentTime)}
      />
      <a
        href={url}
        download
        className="p-2 text-gray-400 hover:text-indigo-600 bg-white rounded-lg border border-gray-200 transition-colors shadow-sm"
        title="Download audio"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  );
};

export default AudioPlayer;

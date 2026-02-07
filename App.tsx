
import React, { useState, useRef, useEffect } from 'react';
import { VOICES, SUPPORTED_LANGUAGES } from './constants';
import { VoiceName, ProcessingStatus, Chapter, User, SavedBook, AudioPart } from './types';
import { identifyChapters, synthesizeChapter } from './services/geminiService';
import { saveBook, getUserBooks, deleteBook } from './services/storageService';
import FileUploader from './components/FileUploader';
import { jwtDecode } from 'jwt-decode';

// Fix: Declare google global variable for Google Identity Services to resolve "Cannot find name 'google'" errors.
declare const google: any;

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const GOOGLE_CLIENT_ID = "64490317169-tic18jivb8ijamdg0evo14i1ue3itika.apps.googleusercontent.com";

const GUEST_USER: User = {
  id: 'guest_user_123',
  name: 'Guest User',
  email: 'guest@example.com',
  picture: 'https://ui-avatars.com/api/?name=Guest+User&background=b45309&color=fff'
};

const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {}
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('es');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.ZEPHYR);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeBookTitle, setActiveBookTitle] = useState<string | null>(null);
  const [library, setLibrary] = useState<SavedBook[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('lumina_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const initGoogle = () => {
      if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            try {
              const decoded: any = jwtDecode(response.credential);
              handleLoginSuccess({
                id: decoded.sub,
                name: decoded.name,
                email: decoded.email,
                picture: decoded.picture
              });
            } catch (e) {}
          }
        });
        google.accounts.id.renderButton(document.getElementById("googleBtn"), { theme: "outline", size: "large", width: 250 });
      }
    };
    setTimeout(initGoogle, 1000);
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('lumina_user', JSON.stringify(userData));
    setError(null);
  };

  const loadLibrary = async () => {
    if (!user) return;
    try {
      const books = await getUserBooks(user.id);
      setLibrary(books);
    } catch (err) {}
  };

  useEffect(() => { if (user) loadLibrary(); }, [user]);

  const handleAnalyze = async () => {
    if (!selectedFile || !user) return;
    try {
      setError(null);
      setStatus('analyzing');
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });
      setPdfBase64(b64);
      const discoveredChapters = await identifyChapters(b64);
      const initialChapters: Chapter[] = discoveredChapters.map(c => ({ 
        ...c, status: 'idle' as const, progress: 0 
      }));
      setChapters(initialChapters);
      setActiveBookTitle(selectedFile.name);
      
      const newBook: SavedBook = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: selectedFile.name,
        pdfBase64: b64,
        chapters: initialChapters,
        createdAt: Date.now()
      };
      await saveBook(newBook);
      setActiveBookId(newBook.id);
      await loadLibrary();
      setStatus('ready');
      if (initialChapters.length > 0) {
        setExpandedChapterId(initialChapters[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze document.");
      setStatus('idle');
    }
  };

  const handleLoadSavedBook = (book: SavedBook) => {
    setPdfBase64(book.pdfBase64);
    const loadedChapters: Chapter[] = book.chapters.map(c => ({ 
      ...c, 
      status: (c.audioParts && c.audioParts.length > 0 ? 'completed' : 'idle') as Chapter['status'],
      progress: (c.audioParts && c.audioParts.length > 0 ? 100 : 0)
    }));
    setChapters(loadedChapters);
    setActiveBookTitle(book.title);
    setActiveBookId(book.id);
    setShowLibrary(false);
    setStatus('ready');
    if (loadedChapters.length > 0) {
      setExpandedChapterId(loadedChapters[0].id);
    }
  };

  const handleUpdatePartTimestamp = (chapterId: string, partId: string, timestamp: number) => {
    if (!activeBookId) return;
    const currentBook = library.find(b => b.id === activeBookId);
    if (!currentBook) return;

    const updatedChapters = chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          audioParts: c.audioParts?.map(p => p.id === partId ? { ...p, lastTimestamp: timestamp } : p)
        };
      }
      return c;
    });

    setChapters(updatedChapters);
    saveBook({ ...currentBook, chapters: updatedChapters }).then(() => loadLibrary());
  };

  const handleGenerateChapter = async (chapterId: string) => {
    if (!pdfBase64 || !activeBookId) return;
    setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, status: 'processing' as const, progress: 5 } : c));
    
    try {
      const chapter = chapters.find(c => c.id === chapterId)!;
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Spanish';
      const audioParts = await synthesizeChapter(pdfBase64, chapter, langName, selectedVoice, (p) => {
        setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, progress: p } : c));
      });
      
      const finalChapters: Chapter[] = chapters.map(c => c.id === chapterId ? { 
        ...c, status: 'completed' as const, audioParts, progress: 100
      } : c);

      setChapters(finalChapters);
      const currentBook = library.find(b => b.id === activeBookId);
      if (currentBook) {
        await saveBook({ ...currentBook, chapters: finalChapters });
        await loadLibrary();
      }
      playSuccessSound();
    } catch (err: any) {
      setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, status: 'error' as const, progress: 0 } : c));
      setError(err.message || "Narrating failed.");
    }
  };

  const toggleChapter = (id: string) => {
    setExpandedChapterId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen pb-20 bg-[#fdfcfb]">
      <header className="bg-white border-b border-gray-100 py-4 px-6 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowLibrary(false)}>
            <div className="bg-amber-700 p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-xl font-serif font-bold text-gray-900">Lumina Books</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <button onClick={() => setShowLibrary(!showLibrary)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${showLibrary ? 'bg-amber-700 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Library ({library.length})
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-gray-900">{user.name}</p>
                    <button onClick={() => { setUser(null); localStorage.removeItem('lumina_user'); }} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest">Logout</button>
                  </div>
                  <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        {!user ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in">
             <div className="bg-amber-700 w-20 h-20 rounded-3xl text-white flex items-center justify-center mb-8 shadow-2xl">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
               </svg>
             </div>
             <h2 className="text-5xl font-serif font-bold text-gray-900 mb-4">Read with your ears.</h2>
             <div id="googleBtn" className="scale-125 mb-4"></div>
             <button onClick={() => handleLoginSuccess(GUEST_USER)} className="text-amber-700 font-bold hover:underline">Or continue as Guest</button>
          </div>
        ) : showLibrary ? (
          <div className="animate-fade-in">
             <h2 className="text-3xl font-serif font-bold text-gray-900 mb-8">My Library</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {library.map(book => (
                  <div key={book.id} onClick={() => handleLoadSavedBook(book)} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-amber-700">{book.title}</h3>
                    <p className="text-xs text-gray-400">Sections: {book.chapters.length}</p>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <FileUploader onFileSelect={setSelectedFile} selectedFile={selectedFile} />
                  <div className="mt-6 space-y-4">
                     <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium">
                        {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                     </select>
                     <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value as VoiceName)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-medium">
                        {VOICES.map(v => <option key={v.id} value={v.id}>{v.name} - {v.description}</option>)}
                     </select>
                     <button onClick={handleAnalyze} disabled={!selectedFile || status === 'analyzing'} className={`w-full py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-3 ${selectedFile && status !== 'analyzing' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-100' : 'bg-gray-100 text-gray-400'}`}>
                        {status === 'analyzing' ? 'Analyzing...' : 'Process Book'}
                     </button>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[600px]">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-serif font-bold text-gray-900">Chapters & Sections</h2>
                     {chapters.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                           {PLAYBACK_SPEEDS.map(s => <button key={s} onClick={() => setPlaybackRate(s)} className={`text-xs font-bold w-9 h-7 rounded transition-all ${playbackRate === s ? 'bg-amber-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>{s}x</button>)}
                        </div>
                     )}
                  </div>

                  <div className="space-y-4">
                     {chapters.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-20 opacity-30">
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                         <p className="text-lg font-serif italic">Your digital shelf awaits...</p>
                       </div>
                     ) : chapters.map((chapter) => {
                        const isExpanded = expandedChapterId === chapter.id;
                        return (
                          <div key={chapter.id} className={`border rounded-xl transition-all overflow-hidden ${isExpanded ? 'border-indigo-300 shadow-md ring-1 ring-indigo-50' : 'border-gray-100 hover:border-gray-300'}`}>
                             {/* Accordion Header */}
                             <div 
                                onClick={() => toggleChapter(chapter.id)}
                                className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/20' : 'bg-white hover:bg-gray-50'}`}
                             >
                                <div className="flex items-center gap-4">
                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                      {chapters.indexOf(chapter) + 1}
                                   </div>
                                   <div>
                                      <h3 className={`font-bold transition-colors ${isExpanded ? 'text-indigo-900' : 'text-gray-900'}`}>{chapter.title}</h3>
                                      {!isExpanded && <p className="text-xs text-gray-400 line-clamp-1">{chapter.summary}</p>}
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   {chapter.audioParts && chapter.audioParts.length > 0 && !isExpanded && (
                                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Ready</span>
                                   )}
                                   <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                   >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                   </svg>
                                </div>
                             </div>
                             
                             {/* Accordion Content */}
                             {isExpanded && (
                                <div className="p-5 pt-0 border-t border-indigo-100/50 animate-fade-in">
                                   <div className="flex items-start justify-between gap-6 mb-6 mt-4">
                                      <div className="flex-1">
                                         <p className="text-sm text-gray-600 leading-relaxed">{chapter.summary}</p>
                                      </div>
                                      <div className="shrink-0">
                                         {chapter.status !== 'processing' ? (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleGenerateChapter(chapter.id); }} 
                                              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${chapter.audioParts?.length ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                            >
                                               {chapter.audioParts?.length ? 'Regenerate Audio' : 'Start Narration'}
                                            </button>
                                         ) : (
                                            <div className="text-right">
                                               <div className="text-[10px] font-black text-indigo-600 mb-1">SYNTHESIZING {chapter.progress}%</div>
                                               <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                  <div className="h-full bg-indigo-600 transition-all duration-300" style={{width: `${chapter.progress}%`}} />
                                               </div>
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                   
                                   {chapter.audioParts && chapter.audioParts.length > 0 && (
                                      <div className="space-y-3 pt-4 border-t border-gray-100">
                                         {chapter.audioParts.map((part) => (
                                            <div key={part.id} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 hover:border-indigo-100 transition-all">
                                               <div className="flex items-center justify-between mb-3">
                                                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">{part.label}</span>
                                                  {part.lastTimestamp && part.lastTimestamp > 0 && (
                                                     <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {Math.floor(part.lastTimestamp / 60)}:{(Math.floor(part.lastTimestamp % 60)).toString().padStart(2, '0')}
                                                     </div>
                                                  )}
                                               </div>
                                               <AudioPlayer 
                                                  url={part.url} 
                                                  rate={playbackRate} 
                                                  initialTime={part.lastTimestamp} 
                                                  onTimeUpdate={(t) => handleUpdatePartTimestamp(chapter.id, part.id, t)}
                                               />
                                            </div>
                                         ))}
                                      </div>
                                   )}
                                </div>
                             )}
                          </div>
                        );
                     })}
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const AudioPlayer: React.FC<{ url: string; rate: number; initialTime?: number; onTimeUpdate: (t: number) => void }> = ({ url, rate, initialTime, onTimeUpdate }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { if (ref.current) ref.current.playbackRate = rate; }, [rate]);
  
  const handleMetadata = () => {
    if (ref.current && initialTime && !ready) {
      ref.current.currentTime = initialTime;
      setReady(true);
    }
  };

  return (
    <div className="flex items-center gap-3">
       <audio ref={ref} src={url} controls className="w-full h-8 custom-audio-mini" onLoadedMetadata={handleMetadata} onTimeUpdate={() => ref.current && onTimeUpdate(ref.current.currentTime)} />
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

export default App;

import React, {useEffect, useState} from 'react';
import {SUPPORTED_LANGUAGES} from './constants';
import {VoiceName, ProcessingStatus, Chapter, User, SavedBook} from './types';
import {identifyChapters, synthesizeChapter} from './services/geminiService';
import {saveBook, getUserBooks} from './services/storageService';
import AppHeader from './components/AppHeader';
import AuthScreen from './components/AuthScreen';
import BookWorkspace from './components/BookWorkspace';
import LibraryView from './components/LibraryView';
import {jwtDecode} from 'jwt-decode';

// Fix: Declare google global variable for Google Identity Services to resolve "Cannot find name 'google'" errors.
declare const google: any;

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
    } catch (e) {
    }
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
                        } catch (e) {
                        }
                    }
                });
                google.accounts.id.renderButton(document.getElementById('googleBtn'), {
                    theme: 'outline',
                    size: 'large',
                    width: 250
                });
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
        } catch (err) {
        }
    };

    useEffect(() => {
        if (user) loadLibrary();
    }, [user]);

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
            const initialChapters: Chapter[] = discoveredChapters.map((c) => ({
                ...c,
                status: 'idle' as const,
                progress: 0
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
            setError(err.message || 'Failed to analyze document.');
            setStatus('idle');
        }
    };

    const handleLoadSavedBook = (book: SavedBook) => {
        setPdfBase64(book.pdfBase64);
        const loadedChapters: Chapter[] = book.chapters.map((c) => ({
            ...c,
            status: (c.audioParts && c.audioParts.length > 0 ? 'completed' : 'idle') as Chapter['status'],
            progress: c.audioParts && c.audioParts.length > 0 ? 100 : 0
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

    const handleStartNewBook = () => {
        setShowLibrary(false);
        setSelectedFile(null);
        setStatus('idle');
        setChapters([]);
        setExpandedChapterId(null);
        setError(null);
        setPdfBase64(null);
        setActiveBookId(null);
        setActiveBookTitle(null);
    };

    const handleUpdatePartTimestamp = (chapterId: string, partId: string, timestamp: number) => {
        if (!activeBookId) return;
        const currentBook = library.find((b) => b.id === activeBookId);
        if (!currentBook) return;

        const updatedChapters = chapters.map((c) => {
            if (c.id === chapterId) {
                return {
                    ...c,
                    audioParts: c.audioParts?.map((p) => (p.id === partId ? {...p, lastTimestamp: timestamp} : p))
                };
            }
            return c;
        });

        setChapters(updatedChapters);
        saveBook({...currentBook, chapters: updatedChapters}).then(() => loadLibrary());
    };

    const handleGenerateChapter = async (chapterId: string) => {
        if (!pdfBase64 || !activeBookId) return;
        setChapters((prev) => prev.map((c) => (c.id === chapterId ? {
            ...c,
            status: 'processing' as const,
            progress: 5
        } : c)));

        try {
            const chapter = chapters.find((c) => c.id === chapterId)!;
            const langName = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || 'Spanish';
            const audioParts = await synthesizeChapter(pdfBase64, chapter, langName, selectedVoice, (p) => {
                setChapters((prev) => prev.map((c) => (c.id === chapterId ? {...c, progress: p} : c)));
            });

            const finalChapters: Chapter[] = chapters.map((c) =>
                c.id === chapterId
                    ? {
                        ...c,
                        status: 'completed' as const,
                        audioParts,
                        progress: 100
                    }
                    : c
            );

            setChapters(finalChapters);
            const currentBook = library.find((b) => b.id === activeBookId);
            if (currentBook) {
                await saveBook({...currentBook, chapters: finalChapters});
                await loadLibrary();
            }
            playSuccessSound();
        } catch (err: any) {
            setChapters((prev) => prev.map((c) => (c.id === chapterId ? {
                ...c,
                status: 'error' as const,
                progress: 0
            } : c)));
            setError(err.message || 'Narrating failed.');
        }
    };

    const toggleChapter = (id: string) => {
        setExpandedChapterId((prev) => (prev === id ? null : id));
    };

    return (
        <div className="min-h-screen pb-20 bg-[#fdfcfb]">
            <AppHeader
                user={user}
                showLibrary={showLibrary}
                libraryCount={library.length}
                onToggleLibrary={() => setShowLibrary(!showLibrary)}
                onLogout={() => {
                    setUser(null);
                    localStorage.removeItem('lumina_user');
                }}
                onLogoClick={() => setShowLibrary(false)}
            />

            <main className="max-w-6xl mx-auto px-4">
                {!user ? (
                    <AuthScreen onGuestLogin={handleLoginSuccess} guestUser={GUEST_USER} googleButtonId="googleBtn"/>
                ) : showLibrary ? (
                    <LibraryView library={library} onSelectBook={handleLoadSavedBook} onAddBook={handleStartNewBook}/>
                ) : (
                    <BookWorkspace
                        selectedFile={selectedFile}
                        onFileSelect={setSelectedFile}
                        targetLang={targetLang}
                        onTargetLangChange={setTargetLang}
                        selectedVoice={selectedVoice}
                        onSelectedVoiceChange={setSelectedVoice}
                        onAnalyze={handleAnalyze}
                        isAnalyzing={status === 'analyzing'}
                        chapters={chapters}
                        expandedChapterId={expandedChapterId}
                        playbackRate={playbackRate}
                        onSetPlaybackRate={setPlaybackRate}
                        onToggleChapter={toggleChapter}
                        onGenerateChapter={handleGenerateChapter}
                        onUpdatePartTimestamp={handleUpdatePartTimestamp}
                    />
                )}
            </main>
        </div>
    );
};

export default App;

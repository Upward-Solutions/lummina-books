import React from 'react';
import { User } from '../types';

const AppHeader: React.FC<{
  user: User | null;
  showLibrary: boolean;
  libraryCount: number;
  onToggleLibrary: () => void;
  onLogout: () => void;
  onLogoClick: () => void;
}> = ({ user, showLibrary, libraryCount, onToggleLibrary, onLogout, onLogoClick }) => {
  return (
    <header className="bg-white border-b border-gray-100 py-4 px-6 mb-8 sticky top-0 z-20 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onLogoClick}>
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
              <button
                onClick={onToggleLibrary}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${showLibrary ? 'bg-amber-700 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Library ({libraryCount})
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-gray-900">{user.name}</p>
                  <button onClick={onLogout} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest">Logout</button>
                </div>
                <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

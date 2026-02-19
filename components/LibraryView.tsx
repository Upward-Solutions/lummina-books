import React from 'react';
import { SavedBook } from '../types';

const LibraryView: React.FC<{
  library: SavedBook[];
  onSelectBook: (book: SavedBook) => void;
  onAddBook: () => void;
}> = ({ library, onSelectBook, onAddBook }) => {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-serif font-bold text-gray-900">My Library</h2>
        <button
          onClick={onAddBook}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 bg-amber-700 text-white shadow-md hover:bg-amber-800 active:scale-95"
        >
          <span className="text-lg leading-none">+</span>
          Add Book
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {library.map((book) => (
          <div
            key={book.id}
            onClick={() => onSelectBook(book)}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <h3 className="font-bold text-gray-900 mb-1 group-hover:text-amber-700">{book.title}</h3>
            <p className="text-xs text-gray-400">Sections: {book.chapters.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LibraryView;

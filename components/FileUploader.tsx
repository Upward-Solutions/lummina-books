
import React, { useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, selectedFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    } else if (file) {
      alert("Please select a valid PDF file.");
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center cursor-pointer
        ${selectedFile ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-white'}`}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        accept=".pdf" 
        className="hidden" 
        ref={inputRef}
        onChange={handleChange}
      />
      
      <div className="bg-indigo-100 p-4 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {selectedFile ? selectedFile.name : 'Upload your book (PDF)'}
      </h3>
      <p className="text-sm text-gray-500 text-center">
        {selectedFile ? 'Click to change file' : 'Drag and drop or click to browse'}
      </p>
      
      {selectedFile && (
        <div className="mt-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          Ready to process
        </div>
      )}
    </div>
  );
};

export default FileUploader;

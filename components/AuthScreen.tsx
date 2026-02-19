import React from 'react';
import { User } from '../types';

const AuthScreen: React.FC<{
  onGuestLogin: (user: User) => void;
  guestUser: User;
  googleButtonId: string;
}> = ({ onGuestLogin, guestUser, googleButtonId }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="bg-amber-700 w-20 h-20 rounded-3xl text-white flex items-center justify-center mb-8 shadow-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      </div>
      <h2 className="text-5xl font-serif font-bold text-gray-900 mb-4">Read with your ears.</h2>
      <div id={googleButtonId} className="scale-125 mb-4"></div>
      <button onClick={() => onGuestLogin(guestUser)} className="text-amber-700 font-bold hover:underline">
        Or continue as Guest
      </button>
    </div>
  );
};

export default AuthScreen;

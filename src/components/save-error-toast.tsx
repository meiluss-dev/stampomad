'use client';

import { useStore } from '@/lib/store';
import { useEffect } from 'react';

export function SaveErrorToast() {
  const { saveError, clearSaveError } = useStore();

  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(clearSaveError, 8000);
      return () => clearTimeout(timer);
    }
  }, [saveError, clearSaveError]);

  if (!saveError) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-stamp-red/95 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm max-w-[90vw]">
        <span className="shrink-0">⚠️</span>
        <span>{saveError}</span>
        <button
          onClick={clearSaveError}
          className="ml-2 text-white/70 hover:text-white shrink-0 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

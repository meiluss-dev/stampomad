'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'stampomad_pwa_dismissed';
const DISMISS_DAYS = 14; // Don't show again for 2 weeks after dismiss

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as unknown as { standalone?: boolean }).standalone) return;

    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedAt = Number(dismissed);
        if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {}

    // Detect iOS (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Show after a short delay so it doesn't feel aggressive
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / desktop Chrome
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay
      setTimeout(() => setShow(true), 3000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[600] md:left-auto md:right-6 md:bottom-6 md:w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-bg2 border border-white/[0.12] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl shrink-0">
            ✈️
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-[family-name:var(--font-playfair)] text-base text-text">
              Install Stampomad
            </div>
            <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed">
              {isIOS
                ? 'Tap the share button, then "Add to Home Screen" for the best experience.'
                : 'Add to your home screen for quick access and offline support.'
              }
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-muted hover:text-text text-lg cursor-pointer bg-transparent border-none shrink-0 leading-none"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>

        {isIOS ? (
          <div className="flex items-center gap-2 mt-3 px-1 text-[12px] text-text-muted">
            <span>Tap</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <span>then <strong className="text-text">&quot;Add to Home Screen&quot;</strong></span>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-lg border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:bg-bg3 transition-colors bg-transparent"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
            >
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

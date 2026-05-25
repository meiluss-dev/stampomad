'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  username: string;
  displayName: string;
  countries: number;
  trips: number;
}

export function ShareProfileButton({ username, displayName, countries, trips }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const profileUrl = `https://www.stampomad.com/u/${username}`;
  const shareText = `Check out ${displayName}'s travel profile — ${countries} countries, ${trips} trips! 🌍✈️`;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div ref={ref} className="relative inline-block mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm cursor-pointer hover:bg-gold/15 transition-all"
      >
        📤 Share profile
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 bg-bg2 border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 w-64 p-3">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Share this profile</div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`, '_blank')}
              className="flex-1 py-2 rounded-lg bg-bg4 border border-white/[0.08] text-sm cursor-pointer hover:bg-[#1da1f2]/20 hover:border-[#1da1f2]/30 transition-all"
            >𝕏</button>
            <button
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, '_blank')}
              className="flex-1 py-2 rounded-lg bg-bg4 border border-white/[0.08] text-sm cursor-pointer hover:bg-[#1877f2]/20 hover:border-[#1877f2]/30 transition-all"
            >f</button>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + profileUrl)}`, '_blank')}
              className="flex-1 py-2 rounded-lg bg-bg4 border border-white/[0.08] text-sm cursor-pointer hover:bg-[#25d366]/20 hover:border-[#25d366]/30 transition-all"
            >💬</button>
          </div>
          <button
            onClick={copyLink}
            className="w-full py-2 rounded-lg bg-bg4 border border-white/[0.08] text-[12px] text-text-muted cursor-pointer hover:border-white/20 transition-all"
          >
            {copied ? '✓ Copied!' : '🔗 Copy link'}
          </button>
        </div>
      )}
    </div>
  );
}

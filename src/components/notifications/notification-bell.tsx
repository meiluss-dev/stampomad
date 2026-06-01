'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { loadNotifications, countUnread, markRead, markAllRead } from '@/lib/supabase/notifications';
import type { Notification } from '@/lib/supabase/notifications';

const TYPE_ICONS: Record<string, string> = {
  expense_added: '💰',
  member_joined: '👥',
  invite_received: '✉️',
  invite_accepted: '✅',
  invite_declined: '❌',
  item_added: '📦',
  item_claimed: '🙋',
  chat_message: '💬',
};

// iOS-compatible notification sound using HTML Audio element
// iOS Safari only allows audio playback initiated by user gesture,
// but once an Audio element has been "unlocked" by a tap, it can be
// replayed programmatically via .play().

let notifAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function createNotifAudio(): HTMLAudioElement {
  // Generate a tiny WAV with a two-tone chime using Web Audio, encode as data URI
  // Fallback: use a minimal base64-encoded WAV beep
  const audio = new Audio();
  // Tiny 44100Hz mono WAV: two sine tones (C5 523Hz + E5 659Hz)
  const sampleRate = 44100;
  const duration = 0.5;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const env1 = t < 0.25 ? Math.max(0, 1 - t * 4) : 0;
    const env2 = t >= 0.12 && t < 0.45 ? Math.max(0, 1 - (t - 0.12) * 3) : 0;
    buffer[i] = (Math.sin(2 * Math.PI * 523.25 * t) * env1 + Math.sin(2 * Math.PI * 659.25 * t) * env2) * 0.3;
  }
  // Encode as 16-bit PCM WAV
  const wavBuffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(wavBuffer);
  const writeStr = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  audio.src = URL.createObjectURL(blob);
  audio.volume = 0.6;
  return audio;
}

function playNotificationSound() {
  try {
    if (!notifAudio) notifAudio = createNotifAudio();
    if (!audioUnlocked) return; // Can't play until user has tapped
    notifAudio.currentTime = 0;
    notifAudio.play().catch(() => {});
  } catch (e) {
    console.log('[Notification] Sound failed:', e);
  }
}

// Unlock audio on first user interaction (required for iOS)
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (!notifAudio) notifAudio = createNotifAudio();
    // Play silent then immediately pause — this "unlocks" the Audio element on iOS
    notifAudio.volume = 0;
    notifAudio.play().then(() => {
      notifAudio!.pause();
      notifAudio!.currentTime = 0;
      notifAudio!.volume = 0.6;
      audioUnlocked = true;
    }).catch(() => {});
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const prevUnreadRef = useRef(-1);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [notifs, count] = await Promise.all([
      loadNotifications(supabase, user.id),
      countUnread(supabase, user.id),
    ]);
    setNotifications(notifs);
    // Play sound when new notifications arrive
    if (count > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      playNotificationSound();
    }
    prevUnreadRef.current = count;
    setUnread(count);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Poll every 10s for new notifications
  useEffect(() => {
    if (!user) return;
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [user, load]);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  async function handleMarkRead(n: Notification) {
    if (n.read) return;
    const supabase = createClient();
    await markRead(supabase, n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    if (!user) return;
    const supabase = createClient();
    await markAllRead(supabase, user.id);
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    setUnread(0);
  }

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-[34px] h-[34px] rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm cursor-pointer hover:bg-white/[0.08] transition-all"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-stamp-red text-[10px] text-white flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] bg-bg2 border border-white/[0.08] rounded-xl min-w-[340px] max-w-[400px] z-[200] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <div className="text-[13px] font-medium">Notifications</div>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-gold cursor-pointer hover:text-gold/80 transition-colors bg-transparent border-none"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                <div className="text-2xl mb-2">🔕</div>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer transition-colors border-b border-white/[0.04] last:border-b-0 ${
                    n.read ? 'opacity-60 hover:opacity-80' : 'bg-gold/[0.03] hover:bg-gold/[0.06]'
                  }`}
                >
                  {/* Avatar or icon */}
                  {n.actorAvatar ? (
                    <img src={n.actorAvatar} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-bg4 flex items-center justify-center text-sm shrink-0 mt-0.5">
                      {TYPE_ICONS[n.type] || '📌'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] leading-snug">
                      <span className="font-medium">{n.actorName}</span>{' '}
                      <span className="text-text-muted">{n.message}</span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-gold shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

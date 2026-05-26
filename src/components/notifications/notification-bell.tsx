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
};

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
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const [notifs, count] = await Promise.all([
      loadNotifications(supabase, user.id),
      countUnread(supabase, user.id),
    ]);
    setNotifications(notifs);
    setUnread(count);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s for new notifications
  useEffect(() => {
    if (!user) return;
    const id = setInterval(load, 30000);
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

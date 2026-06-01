'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { lookupUserByUsername, inviteMember, makeGroupTrip, loadTripMembers } from '@/lib/supabase/group-data';
import { createClient } from '@/lib/supabase/client';
import type { Trip, TripMember } from '@/types';

export function InviteModal({ open, onOpenChange, trip }: { open: boolean; onOpenChange: (open: boolean) => void; trip: Trip }) {
  const { user } = useStore();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ user_id: string; username: string; display_name: string; avatar_url: string | null }[]>([]);
  const [found, setFound] = useState<{ user_id: string; username: string; display_name: string; avatar_url: string | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadMembers() {
    if (loaded) return;
    const supabase = createClient();
    const m = await loadTripMembers(supabase, trip.id);
    setMembers(m);
    setLoaded(true);
  }

  // Load members when modal opens
  if (open && !loaded) loadMembers();

  async function search() {
    if (!username.trim()) return;
    setSearching(true);
    setFound(null);
    setResults([]);
    setNotFound(false);
    try {
      const supabase = createClient();
      const matches = await lookupUserByUsername(supabase, username.trim().toLowerCase());
      const filtered = matches.filter(r => r.user_id !== user?.id);
      if (filtered.length === 1) {
        setFound(filtered[0]);
      } else if (filtered.length > 1) {
        setResults(filtered);
      } else if (matches.length > 0 && filtered.length === 0) {
        toast("That's you!", 'error');
        setNotFound(true);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setSearching(false);
  }

  async function sendInvite() {
    if (!found || !user) return;
    setSending(true);
    try {
      const supabase = createClient();

      // Ensure trip is marked as group + owner is a member
      await makeGroupTrip(supabase, trip.id, user.id);

      // Check if already invited
      if (members.some(m => m.userId === found.user_id)) {
        toast('Already invited!', 'error');
        setSending(false);
        return;
      }

      await inviteMember(supabase, trip.id, found.user_id, user.id);
      toast(`Invited ${found.display_name || found.username}!`);

      // Refresh members
      const m = await loadTripMembers(supabase, trip.id);
      setMembers(m);
      setFound(null);
      setUsername('');
    } catch (err: unknown) {
      console.error('[Invite] Error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to invite';
      toast(msg, 'error');
    }
    setSending(false);
  }

  function reset() {
    setUsername('');
    setFound(null);
    setResults([]);
    setNotFound(false);
    setLoaded(false);
    setMembers([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            👥 {trip.emoji} {trip.name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-text-muted mb-4">
          Invite travelers to join this trip. They&apos;ll get access to the shared budget and item list.
        </p>

        {/* Search for user */}
        <div className="flex gap-2 mb-4">
          <Input
            value={username}
            onChange={e => { setUsername(e.target.value); setNotFound(false); setFound(null); setResults([]); }}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by name or username..."
            className="bg-bg3 border-white/[0.12] text-text"
          />
          <button
            onClick={search}
            disabled={searching || !username.trim()}
            className="px-4 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all disabled:opacity-40 shrink-0"
          >
            {searching ? '...' : 'Find'}
          </button>
        </div>

        {/* Multiple results */}
        {results.length > 1 && (
          <div className="space-y-2 mb-4">
            <div className="text-[11px] text-text-muted uppercase tracking-wider">Select a user</div>
            {results.map(r => (
              <button
                key={r.user_id}
                onClick={() => { setFound(r); setResults([]); }}
                className="flex items-center gap-3 w-full bg-bg3 rounded-xl p-3 cursor-pointer hover:border-teal/30 border border-white/[0.08] transition-all text-left"
              >
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-bg4 flex items-center justify-center text-sm font-semibold">
                    {(r.display_name || r.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{r.display_name || r.username}</div>
                  <div className="text-[11px] text-text-muted">@{r.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Found user */}
        {found && (
          <div className="flex items-center gap-3 bg-teal/8 border border-teal/20 rounded-xl p-3 mb-4">
            {found.avatar_url ? (
              <img src={found.avatar_url} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal text-bg flex items-center justify-center text-lg font-semibold">
                {(found.display_name || found.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium">{found.display_name || found.username}</div>
              <div className="text-[11px] text-text-muted">@{found.username}</div>
            </div>
            <button
              onClick={sendInvite}
              disabled={sending}
              className="px-4 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all disabled:opacity-40"
            >
              {sending ? 'Sending...' : 'Invite'}
            </button>
          </div>
        )}

        {notFound && (
          <div className="text-sm text-stamp-red bg-stamp-red/10 border border-stamp-red/20 rounded-lg px-3 py-2 mb-4">
            No user found. They need a Stampomad profile with a username first.
          </div>
        )}

        {/* Current members */}
        {members.length > 0 && (
          <div>
            <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
              Trip members ({members.length})
            </div>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-bg3 rounded-xl px-3 py-2.5">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-bg4 flex items-center justify-center text-sm font-semibold">
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{m.displayName}</div>
                    <div className="text-[11px] text-text-muted">@{m.username}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === 'owner' && (
                      <span className="text-[10px] text-gold bg-gold/10 border border-gold/20 rounded-md px-2 py-0.5">Owner</span>
                    )}
                    <span className={`text-[10px] rounded-md px-2 py-0.5 ${
                      m.status === 'accepted' ? 'text-teal bg-teal/10 border border-teal/20' :
                      m.status === 'pending' ? 'text-text-muted bg-bg4 border border-white/[0.08]' :
                      'text-stamp-red bg-stamp-red/10 border border-stamp-red/20'
                    }`}>
                      {m.status === 'accepted' ? 'Joined' : m.status === 'pending' ? 'Pending' : 'Declined'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={() => { reset(); onOpenChange(false); }}
            className="px-4 py-2 rounded-lg border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:border-white/20 transition-colors"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

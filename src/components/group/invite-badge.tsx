'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { loadPendingInvites, respondToInvite } from '@/lib/supabase/group-data';
import { createClient } from '@/lib/supabase/client';
import { countryFlag } from '@/lib/countries';
import type { GroupInvite } from '@/types';

export function InviteBadge() {
  const { user } = useStore();
  const { toast } = useToast();
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const data = await loadPendingInvites(supabase, user.id);
    setInvites(data);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function respond(invite: GroupInvite, accept: boolean) {
    try {
      const supabase = createClient();
      await respondToInvite(supabase, invite.id, accept);
      toast(accept ? `Joined ${invite.tripName}!` : 'Invite declined');
      setInvites(prev => prev.filter(i => i.id !== invite.id));
      if (accept) {
        // Reload the page to pick up new group trip
        window.location.reload();
      }
    } catch {
      toast('Failed to respond', 'error');
    }
  }

  if (invites.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-[34px] h-[34px] rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center text-sm cursor-pointer hover:bg-teal/25 transition-all"
      >
        👥
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stamp-red text-[10px] text-white flex items-center justify-center font-bold">
          {invites.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] bg-bg2 border border-white/[0.08] rounded-xl p-3 min-w-[300px] z-[200] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Trip Invites</div>
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="bg-bg3 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{inv.tripEmoji}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{inv.tripName}</div>
                    <div className="text-[11px] text-text-muted">
                      {countryFlag(inv.tripCode)} {inv.tripCode} · from {inv.inviterName}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(inv, true)}
                    className="flex-1 py-1.5 rounded-lg bg-teal text-bg text-xs font-medium cursor-pointer hover:opacity-85 transition-all"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(inv, false)}
                    className="flex-1 py-1.5 rounded-lg bg-bg4 border border-white/[0.08] text-text-muted text-xs cursor-pointer hover:border-white/20 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

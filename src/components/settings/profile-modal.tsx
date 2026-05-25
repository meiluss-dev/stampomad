'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { checkUsernameAvailable } from '@/lib/supabase/data';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function ProfileModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, profile, homebase, saveProfile } = useStore();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUsername(profile?.username || '');
      setDisplayName(profile?.displayName || user?.user_metadata?.full_name || '');
      setBio(profile?.bio || '');
      setStatus('idle');
      setError('');
    }
  }, [open, profile, user]);

  function validateUsername(val: string): boolean {
    return /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(val);
  }

  async function checkUsername(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(clean);

    if (clean.length < 3) { setStatus('idle'); return; }
    if (!validateUsername(clean)) { setStatus('invalid'); return; }
    if (clean === profile?.username) { setStatus('available'); return; }

    setStatus('checking');
    const supabase = createClient();
    const available = await checkUsernameAvailable(supabase, clean, user?.id);
    setStatus(available ? 'available' : 'taken');
  }

  async function save() {
    if (!user) return;
    if (!validateUsername(username)) { setError('Username must be 3-30 chars, lowercase letters, numbers, hyphens'); return; }
    if (status === 'taken') { setError('Username is already taken'); return; }

    setStatus('saving');
    setError('');
    try {
      await saveProfile({
        username,
        displayName,
        bio,
        avatarUrl: user.user_metadata?.avatar_url || null,
        homebase: homebase,
      });
      setStatus('saved');
      toast('Profile saved!');
      setTimeout(() => onOpenChange(false), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      if (msg.includes('username_format')) {
        setError('Username must be 3-30 chars: lowercase letters, numbers, hyphens');
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('Username is already taken');
      } else {
        setError(msg);
      }
      setStatus('idle');
    }
  }

  const profileUrl = username ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${username}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Public Profile</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted leading-relaxed mb-4">
          Set up your public profile so others can follow your travels. Published trips will be visible at your profile URL.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
              Username
            </label>
            <div className="flex items-center gap-2">
              <span className="text-text-muted text-sm shrink-0">/u/</span>
              <Input
                value={username}
                onChange={e => checkUsername(e.target.value)}
                placeholder="your-username"
                className="bg-bg3 border-white/[0.12] text-text"
              />
            </div>
            <div className="mt-1 text-[11px]">
              {status === 'checking' && <span className="text-text-muted">Checking...</span>}
              {status === 'available' && username.length >= 3 && <span className="text-teal">Available</span>}
              {status === 'taken' && <span className="text-stamp-red">Already taken</span>}
              {status === 'invalid' && <span className="text-stamp-red">3-30 chars: lowercase, numbers, hyphens only</span>}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
              Display Name
            </label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="bg-bg3 border-white/[0.12] text-text"
            />
          </div>

          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about your travels..."
              maxLength={300}
              className="w-full bg-bg3 border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-text outline-none resize-y min-h-[80px] max-h-[160px] focus:border-gold/40"
            />
            <div className="text-[10px] text-text-muted text-right">{bio.length}/300</div>
          </div>

          {profileUrl && (
            <div className="bg-bg3 border border-white/[0.08] rounded-lg px-3 py-2">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Your Profile URL</div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-teal break-all flex-1">{profileUrl}</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl).then(() => toast('Link copied!')).catch(() => {});
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-md bg-bg4 border border-white/[0.08] text-[11px] text-text-muted cursor-pointer hover:border-white/20 transition-colors"
                >📋 Copy</button>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my travels on Stampomad! 🌍✈️`)}&url=${encodeURIComponent(profileUrl)}`, '_blank')}
                  className="px-2 py-1 rounded-md bg-bg4 border border-white/[0.08] text-[11px] cursor-pointer hover:bg-[#1da1f2]/20 transition-all"
                >𝕏 Share</button>
                <button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my travels on Stampomad! 🌍✈️ ${profileUrl}`)}`, '_blank')}
                  className="px-2 py-1 rounded-md bg-bg4 border border-white/[0.08] text-[11px] cursor-pointer hover:bg-[#25d366]/20 transition-all"
                >💬 WhatsApp</button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-stamp-red bg-stamp-red/10 border border-stamp-red/20 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-lg border border-white/[0.12] text-text-muted text-sm cursor-pointer hover:bg-bg3 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={status === 'saving' || status === 'taken' || username.length < 3}
            className="flex-1 py-2.5 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Profile'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

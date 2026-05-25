'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function ApiKeysModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mapboxToken, anthropicKey, setMapboxToken, setAnthropicKey } = useStore();
  const [mb, setMb] = useState('');
  const [ak, setAk] = useState('');

  useEffect(() => {
    if (open) {
      setMb(mapboxToken);
      setAk(anthropicKey);
    }
  }, [open, mapboxToken, anthropicKey]);

  async function save() {
    if (mb) await setMapboxToken(mb);
    if (ak) await setAnthropicKey(ak);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">🔑 API Keys Setup</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          Stampomad uses two APIs. Your keys are saved to your account.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
              Mapbox Token (for satellite maps)
            </label>
            <Input
              value={mb}
              onChange={e => setMb(e.target.value)}
              placeholder="pk.eyJ1Ijo..."
              className="bg-bg3 border-white/[0.08] text-text font-mono text-xs"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Get free at <a href="https://mapbox.com" target="_blank" className="text-gold">mapbox.com</a> → Tokens
            </p>
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
              Anthropic API Key (for AI features)
            </label>
            <Input
              value={ak}
              onChange={e => setAk(e.target.value)}
              placeholder="sk-ant-..."
              className="bg-bg3 border-white/[0.08] text-text font-mono text-xs"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Get at <a href="https://console.anthropic.com" target="_blank" className="text-gold">console.anthropic.com</a> → API Keys
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-opacity"
          >
            Save & Continue
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

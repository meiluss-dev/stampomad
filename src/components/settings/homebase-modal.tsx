'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CountrySelect } from './country-select';

export function HomebaseModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { homebase, setHomebase } = useStore();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (open && homebase) {
      setCity(homebase.city || '');
      setCountry(`${homebase.code}|${homebase.continent}|${homebase.flag}`);
    } else if (open) {
      setCity('');
      setCountry('');
    }
  }, [open, homebase]);

  async function save() {
    if (!country) { alert('Please select a country.'); return; }
    const [code, continent, flag] = country.split('|');
    await setHomebase({ city, code, continent, flag });
    onOpenChange(false);
  }

  async function clear() {
    if (!confirm('Remove your home base?')) return;
    await setHomebase(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Set Home Base</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Your current place of residency. Shown in red on the map.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">City / area</label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Guía de Isora, Tenerife" className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Country</label>
            <CountrySelect value={country} onChange={setCountry} includeFlag />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          {homebase && (
            <button onClick={clear} className="px-5 py-2.5 rounded-[10px] border border-stamp-red/30 text-stamp-red text-sm cursor-pointer hover:bg-stamp-red/10 transition-colors">
              Clear homebase
            </button>
          )}
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">Cancel</button>
          <button onClick={save} className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">Save</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

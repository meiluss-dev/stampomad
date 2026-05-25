'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CountrySelect } from './country-select';

export function LivedModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addLivedPlace } = useStore();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function save() {
    if (!country || !from) { alert('Please select a country and start date.'); return; }
    const [code, continent, flag] = country.split('|');
    await addLivedPlace({ city, code, continent, flag, from, to: to || null });
    setCity(''); setCountry(''); setFrom(''); setTo('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add a Place I&apos;ve Lived</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Countries where you&apos;ve lived for 6 months or more.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">City / area</label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Berlin, Mitte" className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Country</label>
            <CountrySelect value={country} onChange={setCountry} includeFlag />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">From</label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">To (leave blank if current)</label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">Cancel</button>
          <button onClick={save} className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">Save</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

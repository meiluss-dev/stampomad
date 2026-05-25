'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CountrySelect } from '@/components/settings/country-select';
import { getContinent } from '@/lib/countries';
import type { Trip } from '@/types';

export function TripModal({ open, onOpenChange, trip }: { open: boolean; onOpenChange: (open: boolean) => void; trip: Trip | null }) {
  const { addTrip, updateTrip } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [country, setCountry] = useState('');
  const [fromCountry, setFromCountry] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [cities, setCities] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && trip) {
      setName(trip.name);
      setEmoji(trip.emoji);
      setCountry(`${trip.code}|${trip.continent}`);
      setFromCountry(trip.fromCode ? `${trip.fromCode}|${getContinent(trip.fromCode)}` : '');
      setStart(trip.start);
      setEnd(trip.end);
      setCities(trip.cities);
      setNotes(trip.notes);
    } else if (open) {
      setName(''); setEmoji('✈️'); setCountry(''); setFromCountry('');
      setStart(''); setEnd(''); setCities(''); setNotes('');
    }
  }, [open, trip]);

  async function save() {
    if (!name || !country || !start || !end) { toast('Please fill in name, country and dates.', 'error'); return; }
    const [code, continent] = country.split('|');
    const fromCode = fromCountry ? fromCountry.split('|')[0] : '';
    const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 864e5) + 1);

    if (trip) {
      await updateTrip({ ...trip, name, code, continent, emoji, start, end, days, cities, notes, fromCode });
      toast('Trip updated!');
    } else {
      await addTrip({ name, code, continent, emoji, start, end, days, cities, notes, quickPin: false, fromCode });
      toast('Trip added!');
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{trip ? 'Edit Trip' : 'Log a New Trip'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Trip name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer in Lisbon" className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">From country</label>
              <CountrySelect value={fromCountry} onChange={setFromCountry} placeholder="Select origin..." />
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">To country</label>
              <CountrySelect value={country} onChange={setCountry} placeholder="Select destination..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Emoji / cover</label>
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🏖️" maxLength={2} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Start date</label>
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">End date</label>
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Cities / places visited</label>
            <Input value={cities} onChange={e => setCities(e.target.value)} placeholder="Lisbon, Porto, Sintra..." className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Trip highlights</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What made this trip unforgettable?" className="bg-bg3 border-white/[0.08] text-text min-h-[90px]" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">Cancel</button>
          <button onClick={save} className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">{trip ? 'Update Trip' : 'Save Trip'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

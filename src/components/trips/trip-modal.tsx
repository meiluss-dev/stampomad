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
  const { addTrip, updateTrip, toggleTripPublished, profile } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [country, setCountry] = useState('');
  const [fromCountry, setFromCountry] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [cities, setCities] = useState('');
  const [notes, setNotes] = useState('');
  const [published, setPublished] = useState(false);

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
      setPublished(trip.published || false);
    } else if (open) {
      setName(''); setEmoji('✈️'); setCountry(''); setFromCountry('');
      setStart(''); setEnd(''); setCities(''); setNotes('');
      setPublished(false);
    }
  }, [open, trip]);

  async function save() {
    if (!name || !country || !start || !end) { toast('Please fill in name, country and dates.', 'error'); return; }
    const [code, continent] = country.split('|');
    const fromCode = fromCountry ? fromCountry.split('|')[0] : '';
    const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 864e5) + 1);

    if (trip) {
      await updateTrip({ ...trip, name, code, continent, emoji, start, end, days, cities, notes, fromCode });
      // Update published status if changed
      if (published !== (trip.published || false)) {
        await toggleTripPublished(trip.id, published);
      }
      toast(published ? 'Trip updated & published to Explore!' : 'Trip updated!');
    } else {
      const newTrip = await addTrip({ name, code, continent, emoji, start, end, days, cities, notes, quickPin: false, fromCode });
      if (published && newTrip?.id) {
        await toggleTripPublished(newTrip.id, true);
        toast('Trip added & published to Explore! 🌍');
      } else {
        toast('Trip added!');
      }
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
        {/* Publish toggle */}
        {profile?.username && (
          <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div>
              <div className="text-sm font-medium">{published ? '🌐 Published to Explore' : '🔒 Private trip'}</div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {published ? 'Visible on the Explore page for everyone' : 'Only you can see this trip'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPublished(!published)}
              className={`relative w-11 h-6 rounded-full transition-colors ${published ? 'bg-gold' : 'bg-white/[0.1]'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${published ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">Cancel</button>
          <button onClick={save} className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">{trip ? 'Update Trip' : 'Save Trip'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

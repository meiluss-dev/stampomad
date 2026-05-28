'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CountrySelect } from '@/components/settings/country-select';
import { getContinent, countryFlag } from '@/lib/countries';
import type { Trip } from '@/types';

const TRAVEL_STYLES = [
  { value: '', label: 'Not set', icon: '' },
  { value: 'solo', label: 'Solo', icon: '🧑' },
  { value: 'couple', label: 'Couple', icon: '💑' },
  { value: 'friends', label: 'Friends', icon: '👫' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'group', label: 'Group tour', icon: '🚌' },
  { value: 'business', label: 'Business', icon: '💼' },
];

export function TripModal({ open, onOpenChange, trip }: { open: boolean; onOpenChange: (open: boolean) => void; trip: Trip | null }) {
  const { addTrip, updateTrip, toggleTripPublished, profile, homebase } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [country, setCountry] = useState('');
  const [fromCountry, setFromCountry] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [cities, setCities] = useState('');
  const [notes, setNotes] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [rating, setRating] = useState(0);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (open && trip) {
      setName(trip.name);
      setEmoji(trip.emoji);
      setCountry(`${trip.code}|${trip.continent}`);
      setFromCountry(trip.fromCode ? `${trip.fromCode}|${getContinent(trip.fromCode)}` : '');
      setFromCity(trip.fromCity || '');
      setToCity(trip.toCity || '');
      setStart(trip.start);
      setEnd(trip.end);
      setCities(trip.cities);
      setNotes(trip.notes);
      setTravelStyle(trip.travelStyle || '');
      setRating(trip.rating || 0);
      setPublished(trip.published || false);
    } else if (open) {
      setName(''); setEmoji('✈️'); setCountry(''); setFromCountry('');
      setFromCity(''); setToCity('');
      setStart(''); setEnd(''); setCities(''); setNotes('');
      setTravelStyle(''); setRating(0); setPublished(false);
      // Pre-fill origin from homebase
      if (homebase) {
        setFromCountry(`${homebase.code}|${homebase.continent}`);
        setFromCity(homebase.city);
      }
    }
  }, [open, trip, homebase]);

  async function save() {
    if (!name || !country || !start || !end) { toast('Please fill in name, country and dates.', 'error'); return; }
    const [code, continent] = country.split('|');
    const fromCode = fromCountry ? fromCountry.split('|')[0] : '';
    const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 864e5) + 1);

    if (trip) {
      await updateTrip({ ...trip, name, code, continent, emoji, start, end, days, cities, notes, fromCode, fromCity, toCity, travelStyle, rating });
      if (published !== (trip.published || false)) {
        await toggleTripPublished(trip.id, published);
      }
      toast(published ? 'Trip updated & published to Explore!' : 'Trip updated!');
    } else {
      const newTrip = await addTrip({ name, code, continent, emoji, start, end, days, cities, notes, quickPin: false, fromCode, fromCity, toCity, travelStyle, rating });
      if (published && newTrip?.id) {
        await toggleTripPublished(newTrip.id, true);
        toast('Trip added & published to Explore! 🌍');
      } else {
        toast('Trip added!');
      }
    }
    onOpenChange(false);
  }

  // Build a preview of the route
  const fromLabel = fromCity || (fromCountry ? countryFlag(fromCountry.split('|')[0]) : '');
  const toLabel = toCity || (country ? countryFlag(country.split('|')[0]) : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{trip ? 'Edit Trip' : 'Log a New Trip'}</DialogTitle>
        </DialogHeader>

        {/* Route preview pill */}
        {(fromLabel || toLabel) && (
          <div className="flex items-center gap-2 text-sm text-text-muted bg-bg3 border border-white/[0.06] rounded-xl px-3 py-2">
            {fromLabel && <span className="text-text">{fromCity ? `${countryFlag(fromCountry.split('|')[0])} ${fromCity}` : fromLabel}</span>}
            {fromLabel && toLabel && <span className="text-gold">→</span>}
            {toLabel && <span className="text-text">{toCity ? `${countryFlag(country.split('|')[0])} ${toCity}` : toLabel}</span>}
            {start && end && (
              <span className="ml-auto text-[11px] text-text-muted">
                {Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 864e5) + 1)} days
              </span>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Trip name + emoji */}
          <div className="grid grid-cols-[1fr_72px] gap-3">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Trip name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer in Sicily" className="bg-bg3 border-white/[0.08] text-text" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Emoji</label>
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🏖️" maxLength={2} className="bg-bg3 border-white/[0.08] text-text text-center" />
            </div>
          </div>

          {/* Origin */}
          <div className="bg-bg3/50 border border-white/[0.04] rounded-xl p-3 space-y-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-medium">From</div>
            <div className="grid grid-cols-2 gap-3">
              <CountrySelect value={fromCountry} onChange={setFromCountry} placeholder="Country..." />
              <Input value={fromCity} onChange={e => setFromCity(e.target.value)} placeholder="City (e.g. Tenerife)" className="bg-bg3 border-white/[0.08] text-text" />
            </div>
          </div>

          {/* Destination */}
          <div className="bg-gold/[0.03] border border-gold/[0.08] rounded-xl p-3 space-y-3">
            <div className="text-[10px] text-gold uppercase tracking-wider font-medium">To (destination)</div>
            <div className="grid grid-cols-2 gap-3">
              <CountrySelect value={country} onChange={setCountry} placeholder="Country..." />
              <Input value={toCity} onChange={e => setToCity(e.target.value)} placeholder="City (e.g. Catania)" className="bg-bg3 border-white/[0.08] text-text" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Start date</label>
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">End date</label>
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
          </div>

          {/* Cities visited */}
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Places visited</label>
            <Input value={cities} onChange={e => setCities(e.target.value)} placeholder="Catania, Taormina, Siracusa..." className="bg-bg3 border-white/[0.08] text-text" />
          </div>

          {/* Travel style + rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Travel style</label>
              <div className="flex flex-wrap gap-1.5">
                {TRAVEL_STYLES.filter(s => s.value).map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setTravelStyle(travelStyle === s.value ? '' : s.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all border ${
                      travelStyle === s.value
                        ? 'bg-gold/10 border-gold/30 text-gold'
                        : 'bg-bg3 border-white/[0.06] text-text-muted hover:border-white/15'
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Rating</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? 0 : star)}
                    className={`text-xl cursor-pointer transition-transform hover:scale-110 ${
                      star <= rating ? 'opacity-100' : 'opacity-25'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Trip highlights</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What made this trip unforgettable?" className="bg-bg3 border-white/[0.08] text-text min-h-[80px]" />
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

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CountrySelect } from '@/components/settings/country-select';
import { getContinent, countryFlag, countryNames } from '@/lib/countries';
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

type ScanStep = 'idle' | 'upload' | 'parsing' | 'review';

interface ParsedTrip {
  name: string;
  emoji: string;
  fromCountry: string | null;
  fromCity: string | null;
  toCountry: string | null;
  toCity: string | null;
  startDate: string | null;
  endDate: string | null;
  cities: string | null;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
}

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

  // Scanner state
  const [scanStep, setScanStep] = useState<ScanStep>('idle');
  const [scanImages, setScanImages] = useState<string[]>([]);
  const [scanPreviews, setScanPreviews] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<ParsedTrip[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isNew = !trip;

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
      setScanStep('idle');
    } else if (open) {
      setName(''); setEmoji('✈️'); setCountry(''); setFromCountry('');
      setFromCity(''); setToCity('');
      setStart(''); setEnd(''); setCities(''); setNotes('');
      setTravelStyle(''); setRating(0); setPublished(false);
      setScanStep('idle'); setScanImages([]); setScanPreviews([]); setScanResults([]);
      if (homebase) {
        setFromCountry(`${homebase.code}|${homebase.continent}`);
        setFromCity(homebase.city);
      }
    }
  }, [open, trip, homebase]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    if (scanImages.length + arr.length > 10) {
      toast('Maximum 10 images allowed', 'error');
      return;
    }
    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setScanImages(prev => [...prev, dataUrl]);
        setScanPreviews(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  }, [scanImages.length, toast]);

  function removeImage(idx: number) {
    setScanImages(prev => prev.filter((_, i) => i !== idx));
    setScanPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function parseDocs() {
    if (scanImages.length === 0) return;
    setScanStep('parsing');

    try {
      const res = await fetch('/api/parse-travel-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: scanImages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast(err.error || 'Failed to parse documents', 'error');
        setScanStep('upload');
        return;
      }

      const data = await res.json();
      const trips = data.trips || [];
      if (trips.length === 0) {
        toast('No trip information found in the documents', 'error');
        setScanStep('upload');
        return;
      }

      setScanResults(trips);
      setScanStep('review');
    } catch {
      toast('Failed to parse documents', 'error');
      setScanStep('upload');
    }
  }

  function applyParsedTrip(t: ParsedTrip) {
    setName(t.name || '');
    setEmoji(t.emoji || '✈️');
    if (t.toCountry) {
      const code = t.toCountry.toUpperCase();
      setCountry(`${code}|${getContinent(code)}`);
    }
    if (t.fromCountry) {
      const code = t.fromCountry.toUpperCase();
      setFromCountry(`${code}|${getContinent(code)}`);
    }
    setFromCity(t.fromCity || '');
    setToCity(t.toCity || '');
    setStart(t.startDate || '');
    setEnd(t.endDate || '');
    setCities(t.cities || '');
    setNotes(t.notes || '');
    setScanStep('idle');
    toast('Trip details filled in — review and save!');
  }

  async function createAllParsed() {
    let created = 0;
    for (const t of scanResults) {
      if (!t.toCountry) continue;
      const code = t.toCountry.toUpperCase();
      const continent = getContinent(code);
      const fromCode = t.fromCountry?.toUpperCase() || '';
      const startDate = t.startDate || new Date().toISOString().split('T')[0];
      const endDate = t.endDate || '';
      const days = endDate
        ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 864e5) + 1)
        : Math.max(1, Math.round((Date.now() - new Date(startDate).getTime()) / 864e5) + 1);

      await addTrip({
        name: t.name || `Trip to ${countryNames[code] || code}`,
        code, continent,
        emoji: t.emoji || '✈️',
        start: startDate, end: endDate, days,
        cities: t.cities || '',
        notes: t.notes || '',
        quickPin: false,
        fromCode,
        fromCity: t.fromCity || '',
        toCity: t.toCity || '',
      });
      created++;
    }
    toast(`${created} trip${created !== 1 ? 's' : ''} created!`);
    onOpenChange(false);
  }

  async function save() {
    if (!name || !country || !start) { toast('Please fill in name, country and start date.', 'error'); return; }
    const [code, continent] = country.split('|');
    const fromCode = fromCountry ? fromCountry.split('|')[0] : '';
    const endDate = end || '';
    const days = endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(start).getTime()) / 864e5) + 1)
      : Math.max(1, Math.round((Date.now() - new Date(start).getTime()) / 864e5) + 1);

    if (trip) {
      await updateTrip({ ...trip, name, code, continent, emoji, start, end: endDate, days, cities, notes, fromCode, fromCity, toCity, travelStyle, rating });
      if (published !== (trip.published || false)) {
        await toggleTripPublished(trip.id, published);
      }
      toast(published ? 'Trip updated & published to Explore!' : 'Trip updated!');
    } else {
      const newTrip = await addTrip({ name, code, continent, emoji, start, end: endDate, days, cities, notes, quickPin: false, fromCode, fromCity, toCity, travelStyle, rating });
      if (published && newTrip?.id) {
        await toggleTripPublished(newTrip.id, true);
        toast('Trip added & published to Explore! 🌍');
      } else {
        toast('Trip added!');
      }
    }
    onOpenChange(false);
  }

  const fromLabel = fromCity || (fromCountry ? countryFlag(fromCountry.split('|')[0]) : '');
  const toLabel = toCity || (country ? countryFlag(country.split('|')[0]) : '');

  const confidenceColor = (c: string) =>
    c === 'high' ? 'text-green-400' : c === 'medium' ? 'text-yellow-400' : 'text-red-400';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{trip ? 'Edit Trip' : 'Log a New Trip'}</DialogTitle>
        </DialogHeader>

        {/* Scanner mode — upload */}
        {isNew && scanStep === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver ? 'border-gold bg-gold/5' : 'border-white/[0.12] hover:border-white/[0.2]'
              }`}
            >
              <div className="text-3xl mb-2">📸</div>
              <div className="text-sm font-medium mb-1">Drop images here or click to browse</div>
              <div className="text-[11px] text-text-muted">Boarding passes, tickets, hotel bookings (max 10)</div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {scanPreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {scanPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="w-full h-16 object-cover rounded-lg border border-white/[0.08]" />
                    <button
                      onClick={e => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full text-[9px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-between">
              <button onClick={() => { setScanStep('idle'); setScanImages([]); setScanPreviews([]); }} className="px-4 py-2 rounded-[10px] text-text-muted text-sm cursor-pointer hover:text-text transition-colors">
                ← Back to manual
              </button>
              <button
                onClick={parseDocs}
                disabled={scanImages.length === 0}
                className="px-5 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✨ Parse Documents
              </button>
            </div>
          </div>
        )}

        {/* Scanner mode — parsing */}
        {isNew && scanStep === 'parsing' && (
          <div className="py-10 text-center">
            <div className="text-4xl mb-3 animate-bounce">🔍</div>
            <div className="text-sm text-text-muted mb-1">AI is reading your travel documents...</div>
            <div className="text-[11px] text-text-muted/60">This usually takes a few seconds</div>
          </div>
        )}

        {/* Scanner mode — review results */}
        {isNew && scanStep === 'review' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {scanResults.length} trip{scanResults.length !== 1 ? 's' : ''} found. Click one to fill the form, or create all at once.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {scanResults.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyParsedTrip(t)}
                  className="w-full p-3 rounded-xl border border-white/[0.08] bg-bg3/50 hover:border-gold/30 hover:bg-gold/[0.03] cursor-pointer transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{t.emoji || '✈️'}</span>
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className={`text-[10px] ${confidenceColor(t.confidence)} ml-auto`}>
                      {t.confidence}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-text-muted">
                    {t.fromCity && t.toCity && <span>📍 {t.fromCity} → {t.toCity}</span>}
                    {t.toCountry && <span>🌍 {countryNames[t.toCountry.toUpperCase()] || t.toCountry}</span>}
                    {t.startDate && <span>📅 {t.startDate}{t.endDate ? ` → ${t.endDate}` : ''}</span>}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-between">
              <button onClick={() => setScanStep('upload')} className="px-4 py-2 rounded-[10px] text-text-muted text-sm cursor-pointer hover:text-text transition-colors">
                ← Back
              </button>
              {scanResults.length > 1 && (
                <button onClick={createAllParsed} className="px-5 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">
                  Create All {scanResults.length} Trips
                </button>
              )}
            </div>
          </div>
        )}

        {/* Normal form — shown when not in scanner mode or when editing */}
        {(scanStep === 'idle' || !isNew) && (
          <>
            {/* Scan documents banner — only for new trips */}
            {isNew && (
              <button
                onClick={() => setScanStep('upload')}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/[0.12] hover:border-gold/30 hover:bg-gold/[0.02] cursor-pointer transition-all text-left"
              >
                <span className="text-2xl">📄</span>
                <div>
                  <div className="text-sm font-medium">Have a boarding pass or booking?</div>
                  <div className="text-[11px] text-text-muted">Upload a photo and AI will fill in the details</div>
                </div>
                <span className="ml-auto text-text-muted text-xs">→</span>
              </button>
            )}

            {/* Route preview pill */}
            {(fromLabel || toLabel) && (
              <div className="flex items-center gap-2 text-sm text-text-muted bg-bg3 border border-white/[0.06] rounded-xl px-3 py-2">
                {fromLabel && <span className="text-text">{fromCity ? `${countryFlag(fromCountry.split('|')[0])} ${fromCity}` : fromLabel}</span>}
                {fromLabel && toLabel && <span className="text-gold">→</span>}
                {toLabel && <span className="text-text">{toCity ? `${countryFlag(country.split('|')[0])} ${toCity}` : toLabel}</span>}
                {start && (
                  <span className="ml-auto text-[11px] text-text-muted">
                    {end
                      ? `${Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 864e5) + 1)} days`
                      : 'Ongoing'}
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
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">End date <span className="normal-case tracking-normal opacity-60">(optional)</span></label>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

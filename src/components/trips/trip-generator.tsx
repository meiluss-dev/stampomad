'use client';

import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getContinent, countryNames } from '@/lib/countries';

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

type Step = 'upload' | 'parsing' | 'review';

export function TripGeneratorModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addTrip } = useStore();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<ParsedTrip[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setImages([]);
    setPreviews([]);
    setStep('upload');
    setParsed([]);
    setSelected(new Set());
    setSaving(false);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    if (images.length + arr.length > 10) {
      toast('Maximum 10 images allowed', 'error');
      return;
    }

    arr.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages(prev => [...prev, dataUrl]);
        setPreviews(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length, toast]);

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function parse() {
    if (images.length === 0) return;
    setStep('parsing');

    try {
      const res = await fetch('/api/parse-travel-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast(err.error || 'Failed to parse documents', 'error');
        setStep('upload');
        return;
      }

      const data = await res.json();
      const trips = data.trips || [];
      if (trips.length === 0) {
        toast('No trip information found in the documents', 'error');
        setStep('upload');
        return;
      }

      setParsed(trips);
      setSelected(new Set(trips.map((_: ParsedTrip, i: number) => i)));
      setStep('review');
    } catch {
      toast('Failed to parse documents', 'error');
      setStep('upload');
    }
  }

  async function createTrips() {
    if (selected.size === 0) return;
    setSaving(true);

    let created = 0;
    for (const idx of selected) {
      const t = parsed[idx];
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
        code,
        continent,
        emoji: t.emoji || '✈️',
        start: startDate,
        end: endDate,
        days,
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
    handleClose(false);
  }

  function toggleSelected(idx: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const confidenceColor = (c: string) =>
    c === 'high' ? 'text-green-400' : c === 'medium' ? 'text-yellow-400' : 'text-red-400';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'upload' && '📄 Generate Trip from Documents'}
            {step === 'parsing' && '🔍 Parsing Documents...'}
            {step === 'review' && '✅ Review Extracted Trips'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Upload photos of boarding passes, flight tickets, hotel bookings, or other travel documents. AI will extract trip details automatically.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-gold bg-gold/5' : 'border-white/[0.12] hover:border-white/[0.2]'
              }`}
            >
              <div className="text-4xl mb-3">📸</div>
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

            {/* Image previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="w-full h-20 object-cover rounded-lg border border-white/[0.08]" />
                    <button
                      onClick={e => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-[10px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => handleClose(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">
                Cancel
              </button>
              <button
                onClick={parse}
                disabled={images.length === 0}
                className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✨ Parse Documents
              </button>
            </div>
          </div>
        )}

        {step === 'parsing' && (
          <div className="py-12 text-center">
            <div className="text-5xl mb-4 animate-bounce">🔍</div>
            <div className="text-sm text-text-muted mb-2">AI is reading your travel documents...</div>
            <div className="text-[11px] text-text-muted/60">This usually takes a few seconds</div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {parsed.length} trip{parsed.length !== 1 ? 's' : ''} detected. Review and select which ones to create.
            </p>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {parsed.map((t, i) => (
                <div
                  key={i}
                  onClick={() => toggleSelected(i)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selected.has(i)
                      ? 'bg-gold/[0.05] border-gold/30'
                      : 'bg-bg3/50 border-white/[0.06] opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${selected.has(i) ? 'bg-gold border-gold' : 'border-white/20'}">
                      {selected.has(i) && <span className="text-[11px]">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{t.emoji || '✈️'}</span>
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className={`text-[10px] ${confidenceColor(t.confidence)} ml-auto`}>
                          {t.confidence} confidence
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-text-muted">
                        {t.fromCity && t.toCity && (
                          <div className="col-span-2">
                            📍 {t.fromCity} → {t.toCity}
                          </div>
                        )}
                        {t.toCountry && (
                          <div>🌍 {countryNames[t.toCountry.toUpperCase()] || t.toCountry}</div>
                        )}
                        {t.startDate && (
                          <div>📅 {t.startDate}{t.endDate ? ` → ${t.endDate}` : ''}</div>
                        )}
                        {t.cities && <div className="col-span-2">🏙️ {t.cities}</div>}
                        {t.notes && <div className="col-span-2 text-[11px] opacity-70">📝 {t.notes}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep('upload')} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">
                Back
              </button>
              <button
                onClick={createTrips}
                disabled={selected.size === 0 || saving}
                className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40"
              >
                {saving ? 'Creating...' : `Create ${selected.size} Trip${selected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

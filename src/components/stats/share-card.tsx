'use client';

import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { getContinent, haversine, getCountryCenter, CONT_TOTALS } from '@/lib/countries';

export function ShareStatsCard() {
  const { trips, visitedCountries, homebase, livedPlaces } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const real = trips.filter(t => !t.quickPin);
  const allCodes = new Set([...visitedCountries, ...real.map(t => t.code)]);
  const totalCountries = allCodes.size;
  const totalTrips = real.length;
  const totalDays = real.reduce((a, t) => a + t.days, 0);
  const continents = new Set([...allCodes].map(c => getContinent(c)).filter(c => c !== 'Other'));
  const pctWorld = Math.round((totalCountries / 195) * 100);
  const totalEntries = real.reduce((a, t) => a + (t.journal?.length || 0), 0);

  // Distance
  const homeCenter = homebase?.code ? getCountryCenter(homebase.code) : null;
  let totalKm = 0;
  for (const trip of real) {
    if (homeCenter) {
      const dest = getCountryCenter(trip.code);
      totalKm += haversine(homeCenter[1], homeCenter[0], dest[1], dest[0]) * 2;
    }
  }

  const generateCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);

    const W = 1200, H = 630;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0a0f1e');
    grad.addColorStop(1, '#111827');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle border
    ctx.strokeStyle = 'rgba(201, 169, 110, 0.3)';
    ctx.lineWidth = 2;
    ctx.roundRect(10, 10, W - 20, H - 20, 16);
    ctx.stroke();

    // Gold accent line at top
    const topGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
    topGrad.addColorStop(0, 'rgba(201, 169, 110, 0)');
    topGrad.addColorStop(0.3, 'rgba(201, 169, 110, 0.8)');
    topGrad.addColorStop(0.7, 'rgba(201, 169, 110, 0.8)');
    topGrad.addColorStop(1, 'rgba(201, 169, 110, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(60, 30, W - 120, 3);

    // Logo
    ctx.fillStyle = '#c9a96e';
    ctx.font = '600 32px serif';
    ctx.fillText('Stampo', 60, 80);
    const sw = ctx.measureText('Stampo').width;
    ctx.fillStyle = '#f0ece4';
    ctx.font = '400 32px serif';
    ctx.fillText('mad', 60 + sw, 80);

    // Tagline
    ctx.fillStyle = '#7a8aa0';
    ctx.font = '14px sans-serif';
    ctx.fillText('stampomad.com', W - 60 - ctx.measureText('stampomad.com').width, 80);

    // Title
    ctx.fillStyle = '#f0ece4';
    ctx.font = '600 42px serif';
    ctx.fillText('My Travel Stats', 60, 145);

    // Divider
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(60, 165, W - 120, 1);

    // Stats grid — 2 rows of 3
    const stats = [
      { label: 'Countries', value: String(totalCountries), sub: `${pctWorld}% of the world` },
      { label: 'Trips', value: String(totalTrips), sub: `${real.length > 0 ? Math.round(totalDays / real.length) : 0}d average` },
      { label: 'Days Abroad', value: String(totalDays), sub: 'total travel days' },
      { label: 'Continents', value: String(continents.size), sub: [...continents].slice(0, 3).join(', ') },
      { label: 'Distance', value: totalKm > 0 ? `${Math.round(totalKm / 1000)}k km` : '—', sub: totalKm > 0 ? `${(totalKm / 40075).toFixed(1)}× around Earth` : '' },
      { label: 'Journal', value: String(totalEntries), sub: 'entries written' },
    ];

    const colW = (W - 120 - 40) / 3;
    stats.forEach((s, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 60 + col * (colW + 20);
      const y = 195 + row * 170;

      // Card background
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      ctx.roundRect(x, y, colW, 150, 12);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, colW, 150, 12);
      ctx.stroke();

      // Gold top accent
      ctx.fillStyle = '#c9a96e';
      ctx.fillRect(x + 20, y, colW - 40, 2);

      // Label
      ctx.fillStyle = '#7a8aa0';
      ctx.font = '600 11px sans-serif';
      ctx.fillText(s.label.toUpperCase(), x + 20, y + 35);

      // Value
      ctx.fillStyle = '#f0ece4';
      ctx.font = '600 44px serif';
      ctx.fillText(s.value, x + 20, y + 90);

      // Sub
      ctx.fillStyle = '#7a8aa0';
      ctx.font = '13px sans-serif';
      ctx.fillText(s.sub, x + 20, y + 120);
    });

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(60, H - 55, W - 120, 1);

    ctx.fillStyle = '#7a8aa0';
    ctx.font = '13px sans-serif';
    ctx.fillText('Generated with Stampomad — stamp the world, log your journey', 60, H - 25);

    setGenerating(false);
  }, [totalCountries, totalTrips, totalDays, continents, totalKm, totalEntries, pctWorld, real]);

  async function handleOpen() {
    setOpen(true);
    // Small delay to ensure canvas is mounted
    setTimeout(() => generateCard(), 50);
  }

  function downloadCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'stampomad-travel-stats.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Stats card downloaded!');
  }

  async function copyToClipboard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Copied to clipboard!');
    } catch {
      toast('Copy not supported — try downloading instead', 'error');
    }
  }

  if (totalCountries === 0 && totalTrips === 0) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm cursor-pointer hover:bg-gold/15 transition-all"
      >
        📤 Share Stats
      </button>

      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-bg2 border border-white/[0.08] rounded-2xl w-full max-w-[680px] mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl">Share Your Stats</h2>
                <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text text-xl cursor-pointer bg-transparent border-none">×</button>
              </div>
            </div>

            <div className="px-5 pb-2">
              <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto block"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
              {generating && (
                <div className="text-center text-text-muted text-sm py-4">Generating card...</div>
              )}
            </div>

            <div className="p-4 pt-3 border-t border-white/[0.08] flex justify-end gap-2">
              <button onClick={copyToClipboard} className="px-4 py-2 rounded-lg border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:border-white/20 transition-colors bg-transparent">
                📋 Copy
              </button>
              <button onClick={downloadCard} className="px-5 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
                ⬇ Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

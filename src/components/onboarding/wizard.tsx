'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { CountrySelect } from '@/components/settings/country-select';
import { Input } from '@/components/ui/input';
import { countryNames, countryFlag, getContinent } from '@/lib/countries';

const POPULAR_COUNTRIES = ['US', 'GB', 'FR', 'ES', 'IT', 'DE', 'JP', 'TH', 'AU', 'MX', 'BR', 'PT', 'GR', 'NL', 'TR', 'IN', 'ID', 'VN', 'MA', 'HR'];

export function OnboardingWizard() {
  const { user, loading, trips, homebase, setHomebase, toggleVisitedCountry, visitedCountries } = useStore();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Homebase step
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Pin countries step
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading || !user) return;
    const dismissed = localStorage.getItem('stampomad-onboarding-done');
    if (dismissed) return;
    // Show wizard if user has no trips and no homebase (new user)
    const realTrips = trips.filter(t => !t.quickPin);
    if (realTrips.length === 0 && !homebase && visitedCountries.size === 0) {
      setShow(true);
    }
  }, [loading, user, trips, homebase, visitedCountries]);

  function dismiss() {
    localStorage.setItem('stampomad-onboarding-done', '1');
    setShow(false);
  }

  async function handleHomebaseSave() {
    if (country) {
      const [code, continent, flag] = country.split('|');
      await setHomebase({ city, code, continent, flag });
      toast('Home base set!');
    }
    setStep(1);
  }

  function togglePin(code: string) {
    setPinned(prev => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code); else n.add(code);
      return n;
    });
  }

  async function handlePinsSave() {
    for (const code of pinned) {
      if (!visitedCountries.has(code)) {
        await toggleVisitedCountry(code);
      }
    }
    if (pinned.size > 0) toast(`${pinned.size} countries pinned!`);
    setStep(2);
  }

  function handleFinish() {
    toast('Welcome to Stampomad!', 'info');
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg2 border border-white/[0.08] rounded-2xl w-full max-w-[560px] mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-gold' : 'bg-white/[0.08]'}`} />
          ))}
        </div>

        <div className="px-6 py-5">
          {step === 0 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🏠</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">Welcome to Stampomad!</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Let&apos;s set up your travel profile. First, where do you call home?
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">City / area</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. London, New York, Tokyo" className="bg-bg3 border-white/[0.08] text-text" />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Country</label>
                  <CountrySelect value={country} onChange={setCountry} includeFlag />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border border-white/[0.08] hover:border-white/20 transition-colors">
                  Skip
                </button>
                <button onClick={handleHomebaseSave} className="px-6 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
                  Set Home Base →
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">🌍</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">Pin Countries You&apos;ve Visited</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Tap to select — you can always add more from the map later.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mb-4 max-h-[240px] overflow-y-auto">
                {POPULAR_COUNTRIES.map(code => {
                  const selected = pinned.has(code);
                  return (
                    <button
                      key={code}
                      onClick={() => togglePin(code)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] cursor-pointer border transition-all ${
                        selected
                          ? 'bg-gold/15 border-gold/40 text-gold'
                          : 'bg-bg3 border-white/[0.08] text-text-muted hover:border-white/20 hover:text-text'
                      }`}
                    >
                      <span className="text-base">{countryFlag(code)}</span>
                      {countryNames[code]}
                      {selected && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="text-center text-[11px] text-text-muted mb-4">
                {pinned.size > 0 ? `${pinned.size} selected` : 'Popular destinations shown — right-click the map for any country'}
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border border-white/[0.08] hover:border-white/20 transition-colors">
                  Skip
                </button>
                <button onClick={handlePinsSave} className="px-6 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
                  Pin Countries →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">✈️</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">You&apos;re All Set!</h2>
                <p className="text-sm text-text-muted leading-relaxed max-w-[380px] mx-auto">
                  Your travel dashboard is ready. Here&apos;s what you can do next:
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">🗺️</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Right-click the map</div>
                    <div className="text-[12px] text-text-muted">Pin any country as visited</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">📝</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Add detailed trips</div>
                    <div className="text-[12px] text-text-muted">Log dates, photos, route maps & journal entries</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">🌐</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Share your story</div>
                    <div className="text-[12px] text-text-muted">Set up a public profile and share your travels</div>
                  </div>
                </div>
              </div>
              <button onClick={handleFinish} className="w-full py-3 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
                Start Exploring →
              </button>
            </div>
          )}
        </div>

        {/* Dismiss link */}
        <div className="text-center pb-4">
          <button onClick={dismiss} className="text-[11px] text-text-muted hover:text-text cursor-pointer bg-transparent border-none transition-colors">
            Skip setup entirely
          </button>
        </div>
      </div>
    </div>
  );
}

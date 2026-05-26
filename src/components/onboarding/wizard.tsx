'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { CountrySelect } from '@/components/settings/country-select';
import { Input } from '@/components/ui/input';
import { countryNames, countryFlag, getContinent } from '@/lib/countries';
import { checkUsernameAvailable } from '@/lib/supabase/data';
import { createClient } from '@/lib/supabase/client';

const STEPS = ['Profile', 'Home Base', 'Countries', 'First Trip', 'Ready'];

const POPULAR_COUNTRIES = [
  'US', 'GB', 'FR', 'ES', 'IT', 'DE', 'JP', 'TH', 'AU', 'MX',
  'BR', 'PT', 'GR', 'NL', 'TR', 'IN', 'ID', 'VN', 'MA', 'HR',
  'CZ', 'PL', 'SE', 'AT', 'CH', 'IE', 'PH', 'KR', 'ZA', 'EG',
];

export function OnboardingWizard() {
  const {
    user, loading, trips, homebase, visitedCountries,
    setHomebase, toggleVisitedCountry, addTrip, saveProfile, profile,
  } = useStore();
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Profile step
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Homebase step
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Pin countries step
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [countrySearch, setCountrySearch] = useState('');

  // First trip step
  const [tripName, setTripName] = useState('');
  const [tripCountry, setTripCountry] = useState('');
  const [tripStart, setTripStart] = useState('');
  const [tripEnd, setTripEnd] = useState('');
  const [tripCities, setTripCities] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    const dismissed = localStorage.getItem('stampomad-onboarding-done');
    if (dismissed) return;
    const realTrips = trips.filter(t => !t.quickPin);
    if (realTrips.length === 0 && !homebase && visitedCountries.size === 0) {
      // Pre-fill display name from auth metadata
      setDisplayName(user.user_metadata?.full_name || '');
      setShow(true);
    }
  }, [loading, user, trips, homebase, visitedCountries]);

  function dismiss() {
    localStorage.setItem('stampomad-onboarding-done', '1');
    setShow(false);
  }

  // --- Profile step ---
  async function checkUsername(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setUsername(clean);
    if (clean.length < 3) { setUsernameStatus('idle'); return; }
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(clean)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    const supabase = createClient();
    const available = await checkUsernameAvailable(supabase, clean, user?.id);
    setUsernameStatus(available ? 'available' : 'taken');
  }

  async function handleProfileSave() {
    if (!user) return;
    if (username.length >= 3 && usernameStatus !== 'taken' && usernameStatus !== 'invalid') {
      try {
        await saveProfile({
          username,
          displayName,
          bio: '',
          avatarUrl: user.user_metadata?.avatar_url || null,
          homebase: null,
        });
        toast('Profile created!');
      } catch {
        toast('Could not save profile', 'error');
      }
    }
    setStep(1);
  }

  // --- Homebase step ---
  async function handleHomebaseSave() {
    if (country) {
      const [code, continent, flag] = country.split('|');
      await setHomebase({ city, code, continent, flag });
      toast('Home base set!');
    }
    setStep(2);
  }

  // --- Pin countries step ---
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
    setStep(3);
  }

  // --- First trip step ---
  async function handleTripSave() {
    if (!tripName || !tripCountry || !tripStart || !tripEnd) {
      setStep(4); // skip if incomplete
      return;
    }
    const [code, continent] = tripCountry.split('|');
    const days = Math.max(1, Math.round((new Date(tripEnd).getTime() - new Date(tripStart).getTime()) / 864e5) + 1);
    try {
      await addTrip({
        name: tripName, code, continent, emoji: '✈️',
        start: tripStart, end: tripEnd, days,
        cities: tripCities, notes: '', quickPin: false, fromCode: '',
      });
      toast('First trip logged!');
    } catch {
      toast('Could not save trip', 'error');
    }
    setStep(4);
  }

  // --- Finish ---
  function handleFinish() {
    toast('Welcome to Stampomad!', 'info');
    dismiss();
  }

  // Filter countries for search
  const filteredCountries = countrySearch.trim()
    ? POPULAR_COUNTRIES.filter(c =>
        (countryNames[c] || '').toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : POPULAR_COUNTRIES;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg2 border border-white/[0.08] rounded-2xl w-full max-w-[560px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-gold' : 'bg-white/[0.08]'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between px-6 mt-1.5 mb-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`text-[9px] uppercase tracking-wider transition-colors ${
                i <= step ? 'text-gold' : 'text-white/20'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* STEP 0: Profile */}
          {step === 0 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">👋</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">Welcome to Stampomad!</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Set up your traveler profile in just a few steps. This takes under a minute.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Display name</label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="bg-bg3 border-white/[0.08] text-text"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">
                    Username
                    {usernameStatus === 'available' && <span className="text-teal ml-2">✓ Available</span>}
                    {usernameStatus === 'taken' && <span className="text-stamp-red ml-2">✗ Taken</span>}
                    {usernameStatus === 'invalid' && <span className="text-stamp-red ml-2">3-30 chars, letters, numbers, hyphens</span>}
                    {usernameStatus === 'checking' && <span className="text-text-muted ml-2">Checking...</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                    <Input
                      value={username}
                      onChange={e => checkUsername(e.target.value)}
                      placeholder="choose-a-username"
                      className="bg-bg3 border-white/[0.08] text-text pl-8"
                    />
                  </div>
                  <div className="text-[11px] text-text-muted mt-1.5">
                    This creates your public profile at stampomad.com/u/{username || '...'}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border border-white/[0.08] hover:border-white/20 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleProfileSave}
                  disabled={username.length > 0 && (usernameStatus === 'taken' || usernameStatus === 'invalid')}
                  className="px-6 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Home Base */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🏠</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">Where Do You Call Home?</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Your home base anchors your travel map and unlocks distance stats.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">City / area</label>
                  <Input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. London, New York, Tokyo"
                    className="bg-bg3 border-white/[0.08] text-text"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Country</label>
                  <CountrySelect value={country} onChange={setCountry} includeFlag />
                </div>
              </div>
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border-none hover:text-text transition-colors"
                >
                  ← Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border border-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleHomebaseSave}
                    className="px-6 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all"
                  >
                    Set Home Base →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Pin Countries */}
          {step === 2 && (
            <div>
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">🌍</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">Countries You&apos;ve Visited</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Tap to select — you can always add more from the map later.
                </p>
              </div>
              <div className="mb-3">
                <Input
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder="Search countries..."
                  className="bg-bg3 border-white/[0.08] text-text text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-3 max-h-[220px] overflow-y-auto pr-1">
                {filteredCountries.map(code => {
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
                {filteredCountries.length === 0 && (
                  <div className="text-sm text-text-muted py-4 text-center w-full">
                    No matches — you can right-click the map to pin any country
                  </div>
                )}
              </div>
              <div className="text-center text-[11px] text-text-muted mb-4">
                {pinned.size > 0
                  ? `${pinned.size} selected`
                  : 'Popular destinations shown — right-click the map for any country'}
              </div>
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border-none hover:text-text transition-colors"
                >
                  ← Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border border-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handlePinsSave}
                    className="px-6 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all"
                  >
                    Pin Countries →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: First Trip */}
          {step === 3 && (
            <div>
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">✈️</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">Log Your First Trip</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Remember a favorite trip? Log it now — you can add photos, journal entries and route maps later.
                </p>
              </div>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Trip name</label>
                  <Input
                    value={tripName}
                    onChange={e => setTripName(e.target.value)}
                    placeholder="e.g. Summer in Lisbon"
                    className="bg-bg3 border-white/[0.08] text-text"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Country</label>
                  <CountrySelect value={tripCountry} onChange={setTripCountry} placeholder="Where did you go?" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Start date</label>
                    <Input
                      type="date"
                      value={tripStart}
                      onChange={e => setTripStart(e.target.value)}
                      className="bg-bg3 border-white/[0.08] text-text"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">End date</label>
                    <Input
                      type="date"
                      value={tripEnd}
                      onChange={e => setTripEnd(e.target.value)}
                      className="bg-bg3 border-white/[0.08] text-text"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Cities visited</label>
                  <Input
                    value={tripCities}
                    onChange={e => setTripCities(e.target.value)}
                    placeholder="Lisbon, Porto, Sintra..."
                    className="bg-bg3 border-white/[0.08] text-text"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border-none hover:text-text transition-colors"
                >
                  ← Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(4)}
                    className="px-5 py-2.5 rounded-xl text-text-muted text-sm cursor-pointer bg-transparent border border-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleTripSave}
                    className="px-6 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all"
                  >
                    Log Trip →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: All Set */}
          {step === 4 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl mb-2">You&apos;re All Set!</h2>
                <p className="text-sm text-text-muted leading-relaxed max-w-[380px] mx-auto">
                  Your travel dashboard is ready. Here&apos;s what you can explore:
                </p>
              </div>
              <div className="space-y-2.5 mb-6">
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">🗺️</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Interactive world map</div>
                    <div className="text-[12px] text-text-muted">Right-click to pin any country as visited</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">📝</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Trip journal & photos</div>
                    <div className="text-[12px] text-text-muted">Log dates, upload photos, draw route maps & write entries</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">👥</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Group trips</div>
                    <div className="text-[12px] text-text-muted">Invite friends, split expenses, plan packing lists together</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-bg3 rounded-xl p-3.5">
                  <span className="text-xl mt-0.5">🌐</span>
                  <div>
                    <div className="text-[13px] font-medium mb-0.5">Share your story</div>
                    <div className="text-[12px] text-text-muted">Publish trips and share your public travel profile</div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all"
              >
                Start Exploring →
              </button>
            </div>
          )}
        </div>

        {/* Dismiss link */}
        <div className="text-center pb-4">
          <button
            onClick={dismiss}
            className="text-[11px] text-text-muted hover:text-text cursor-pointer bg-transparent border-none transition-colors"
          >
            Skip setup entirely
          </button>
        </div>
      </div>
    </div>
  );
}

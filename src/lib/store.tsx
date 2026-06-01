'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Trip, JournalEntry, Homebase, LivedPlace, RouteData, ClockEntry, PackingList } from '@/types';
import { countryNames, getContinent, countryFlag } from '@/lib/countries';
import { createClient } from '@/lib/supabase/client';
import {
  loadTripsFromSupabase, loadSettingsFromSupabase, loadRoutesFromSupabase,
  loadPhotosFromSupabase, saveTripToSupabase, deleteTripFromSupabase,
  saveSettingsToSupabase, saveRouteToSupabase, savePhotosToSupabase,
  deleteJournalEntryFromSupabase,
  loadProfileFromSupabase, saveProfileToSupabase, setTripPublished,
  loadPackingListsFromSupabase, savePackingListsToSupabase,
  type UserProfile,
} from '@/lib/supabase/data';
import type { User } from '@supabase/supabase-js';
import { trackFeatureUsage, trackCreate } from '@/lib/tracking';
import { clearTierCache } from '@/hooks/use-feature';
import { enqueueOp, getPendingCount, isOnline } from '@/lib/offline-queue';
import { loadGroupMemberships } from '@/lib/supabase/group-data';
import { flushOfflineQueue } from '@/lib/offline-sync';

interface StoreContextType {
  user: User | null;
  loading: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  trips: Trip[];
  visitedCountries: Set<string>;
  homebase: Homebase | null;
  livedPlaces: LivedPlace[];
  routes: Record<number, RouteData>;
  tripPhotos: Record<number, string[]>;
  clocks: ClockEntry[];
  mapboxToken: string;
  anthropicKey: string;
  profile: UserProfile | null;
  packingLists: Record<number, PackingList>;
  wishlist: Set<string>;

  addTrip: (trip: Omit<Trip, 'id' | 'journal'>) => Promise<Trip>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (id: number) => Promise<void>;
  toggleVisitedCountry: (code: string) => Promise<void>;

  addJournalEntry: (tripId: number, entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  updateJournalEntry: (tripId: number, entry: JournalEntry) => Promise<void>;
  deleteJournalEntry: (tripId: number, entryId: number) => Promise<void>;

  setHomebase: (hb: Homebase | null) => Promise<void>;
  setLivedPlaces: (places: LivedPlace[]) => Promise<void>;
  addLivedPlace: (place: Omit<LivedPlace, 'id'>) => Promise<void>;
  removeLivedPlace: (id: number) => Promise<void>;

  saveRoute: (tripId: number, route: RouteData) => Promise<void>;
  saveTripPhotos: (tripId: number, photos: string[]) => Promise<void>;

  setClocks: (clocks: ClockEntry[]) => Promise<void>;
  setMapboxToken: (token: string) => Promise<void>;
  setAnthropicKey: (key: string) => Promise<void>;

  saveProfile: (profile: UserProfile) => Promise<void>;
  toggleTripPublished: (tripId: number, published: boolean) => Promise<void>;
  savePackingList: (tripId: number, list: PackingList) => Promise<void>;
  toggleWishlist: (code: string) => Promise<void>;

  pendingOps: number;
  isOffline: boolean;

  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function StoreProvider({ children, initialUser }: { children: React.ReactNode; initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(new Set());
  const [homebase, setHomebaseState] = useState<Homebase | null>(null);
  const [livedPlaces, setLivedPlacesState] = useState<LivedPlace[]>([]);
  const [routes, setRoutes] = useState<Record<number, RouteData>>({});
  const [tripPhotos, setTripPhotos] = useState<Record<number, string[]>>({});
  const [clocks, setClocksState] = useState<ClockEntry[]>([]);
  const [mapboxToken, setMapboxTokenState] = useState(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '');
  const [anthropicKey, setAnthropicKeyState] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [packingLists, setPackingLists] = useState<Record<number, PackingList>>({});
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingOps, setPendingOps] = useState(0);
  const [offline, setOffline] = useState(false);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const supabase = useRef(createClient());

  useEffect(() => {
    if (!user) { console.log('[Stampomad] No user, skipping load'); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
      const sb = supabase.current;
      const userId = user!.id;
      console.log('[Stampomad] Loading data for user:', userId);

      let [tripsData, settings, routesData, photosData, profileData, packingData] = await Promise.all([
        loadTripsFromSupabase(sb, userId),
        loadSettingsFromSupabase(sb, userId),
        loadRoutesFromSupabase(sb, userId),
        loadPhotosFromSupabase(sb, userId),
        loadProfileFromSupabase(sb, userId),
        loadPackingListsFromSupabase(sb, userId),
      ]);

      if (cancelled) return;

      // Load group trips the user is a member of (not owner)
      const groupMemberships = await loadGroupMemberships(sb, userId);
      const ownTripIds = new Set(tripsData.map(t => t.id));
      const memberTrips: Trip[] = groupMemberships
        .filter(m => m.trip && !ownTripIds.has(m.trip.id))
        .map(m => ({
          id: m.trip!.id,
          name: m.trip!.name,
          code: m.trip!.code,
          continent: m.trip!.continent,
          emoji: m.trip!.emoji,
          start: m.trip!.start,
          end: m.trip!.end || '',
          days: m.trip!.days,
          cities: m.trip!.cities,
          notes: '',
          quickPin: false,
          isGroup: true,
          journal: [],
        }));
      if (memberTrips.length > 0) {
        console.log('[Stampomad] Also loaded', memberTrips.length, 'group trips as member');
      }

      tripsData = [...tripsData, ...memberTrips];

      console.log('[Stampomad] Loaded:', tripsData.length, 'trips,', Object.keys(routesData).length, 'routes, settings:', !!settings);

      // Clean up: remove quickPins for countries that already have a real trip
      const realTripCodes = new Set(tripsData.filter(t => !t.quickPin).map(t => t.code));
      const dupeQuickPins = tripsData.filter(t => t.quickPin && realTripCodes.has(t.code));
      if (dupeQuickPins.length > 0) {
        console.log('[Stampomad] Cleaning up', dupeQuickPins.length, 'redundant quickPins');
        tripsData = tripsData.filter(t => !(t.quickPin && realTripCodes.has(t.code)));
        // Remove from DB in background
        dupeQuickPins.forEach(qp => deleteTripFromSupabase(sb, userId, qp.id).catch(() => {}));
      }

      setTrips(tripsData);

      // Cache trip summaries for offline page (lightweight, no journal/photos)
      try {
        const offlineCache = tripsData.filter(t => !t.quickPin).map(t => ({
          id: t.id, name: t.name, code: t.code, continent: t.continent,
          emoji: t.emoji, start: t.start, end: t.end, days: t.days,
          cities: t.cities, travelStyle: t.travelStyle, rating: t.rating,
        }));
        localStorage.setItem('stampomad_offline_trips', JSON.stringify(offlineCache));
        localStorage.setItem('stampomad_offline_stats', JSON.stringify({
          countries: new Set(tripsData.filter(t => !t.quickPin).map(t => t.code)).size,
          trips: tripsData.filter(t => !t.quickPin).length,
          days: tripsData.filter(t => !t.quickPin).reduce((s, t) => s + (t.days || 0), 0),
        }));
      } catch {}

      const vc = new Set<string>();
      tripsData.filter(t => t.quickPin).forEach(t => vc.add(t.code));
      setVisitedCountries(vc);

      if (settings) {
        setHomebaseState(settings.homebase);
        setLivedPlacesState(settings.livedPlaces);
        setClocksState(settings.clocks.length > 0 ? settings.clocks : defaultClocks);
        const validUserToken = settings.mapboxToken && settings.mapboxToken.startsWith('pk.') ? settings.mapboxToken : '';
        if (validUserToken) setMapboxTokenState(validUserToken);
        else if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) setMapboxTokenState(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
        if (settings.anthropicKey) setAnthropicKeyState(settings.anthropicKey);
        if (settings.wishlist?.length) setWishlist(new Set(settings.wishlist));
      } else {
        setClocksState(defaultClocks);
      }

      setRoutes(routesData);
      console.log('[Stampomad] Setting photos:', Object.keys(photosData).length, 'trips with photos, total photos:', Object.values(photosData).reduce((a, b) => a + b.length, 0));
      setTripPhotos(photosData);
      if (profileData) setProfile(profileData);
      setPackingLists(packingData);
      setLoading(false);
      } catch (err) {
        console.error('[Stampomad] Load failed:', err);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.current.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Online/offline detection + auto-sync
  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  useEffect(() => {
    setOffline(!navigator.onLine);
    getPendingCount().then(setPendingOps).catch(() => {});

    const goOnline = async () => {
      setOffline(false);
      if (!user) return;
      const count = await getPendingCount().catch(() => 0);
      if (count > 0) {
        console.log('[Stampomad] Back online, syncing', count, 'pending operations...');
        const result = await flushOfflineQueue(
          supabase.current,
          user.id,
          (tripId) => tripsRef.current.find(t => t.id === tripId),
        );
        setPendingOps(0);
        if (result.synced > 0) {
          console.log(`[Stampomad] Synced ${result.synced} operations`);
        }
      }
    };
    const goOffline = () => setOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [user]);

  const settingsRef = useRef({ homebase, livedPlaces, clocks, mapboxToken, anthropicKey, wishlist });
  settingsRef.current = { homebase, livedPlaces, clocks, mapboxToken, anthropicKey, wishlist };

  const persistSettings = useCallback(async (overrides: Partial<{
    homebase: Homebase | null; livedPlaces: LivedPlace[]; clocks: ClockEntry[];
    mapboxToken: string; anthropicKey: string; wishlist: Set<string>;
  }> = {}) => {
    if (!user) return;
    const s = settingsRef.current;
    try {
      await saveSettingsToSupabase(supabase.current, user.id, {
        homebase: overrides.homebase !== undefined ? overrides.homebase : s.homebase,
        livedPlaces: overrides.livedPlaces !== undefined ? overrides.livedPlaces : s.livedPlaces,
        clocks: overrides.clocks !== undefined ? overrides.clocks : s.clocks,
        lang: 'en',
        translations: {},
        mapboxToken: overrides.mapboxToken !== undefined ? overrides.mapboxToken : s.mapboxToken,
        anthropicKey: overrides.anthropicKey !== undefined ? overrides.anthropicKey : s.anthropicKey,
        wishlist: [...(overrides.wishlist !== undefined ? overrides.wishlist : s.wishlist)],
      });
    } catch (err) {
      setSaveError('Failed to save settings. Your changes may be lost on reload.');
      console.error('[Stampomad] persistSettings failed:', err);
    }
  }, [user]);

  const addTrip = useCallback(async (tripData: Omit<Trip, 'id' | 'journal'>) => {
    const trip: Trip = { ...tripData, id: Date.now(), journal: [] };

    // If adding a real trip, remove any existing quickPin for the same country
    let quickPinId: number | null = null;
    setTrips(prev => {
      if (!tripData.quickPin) {
        const existing = prev.find(t => t.quickPin && t.code === tripData.code);
        if (existing) quickPinId = existing.id;
        return [...prev.filter(t => !(t.quickPin && t.code === tripData.code)), trip];
      }
      return [...prev, trip];
    });
    if (quickPinId !== null) {
      setVisitedCountries(prev => { const n = new Set(prev); n.delete(tripData.code); return n; });
    }

    if (user) {
      try {
        if (quickPinId !== null) await deleteTripFromSupabase(supabase.current, user.id, quickPinId);
        await saveTripToSupabase(supabase.current, user.id, trip);
      } catch (err) {
        setSaveError('Failed to save trip. Your changes may be lost on reload.');
        console.error('[Stampomad] addTrip save failed:', err);
      }
    }
    if (!tripData.quickPin) trackCreate('unlimited_trips', { country: tripData.code });
    return trip;
  }, [user]);

  const updateTrip = useCallback(async (trip: Trip) => {
    setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));
    if (user) await saveTripToSupabase(supabase.current, user.id, trip);
  }, [user]);

  const deleteTrip = useCallback(async (id: number) => {
    setTrips(prev => prev.filter(t => t.id !== id));
    setTripPhotos(prev => { const n = { ...prev }; delete n[id]; return n; });
    setRoutes(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (user) await deleteTripFromSupabase(supabase.current, user.id, id);
  }, [user]);

  const toggleVisitedCountry = useCallback(async (code: string) => {
    const existing = trips.find(t => t.quickPin && t.code === code);
    if (existing) {
      // Remove quickPin trip
      setTrips(prev => prev.filter(t => t.id !== existing.id));
      setVisitedCountries(prev => { const n = new Set(prev); n.delete(code); return n; });
      if (user) await deleteTripFromSupabase(supabase.current, user.id, existing.id);
    } else {
      // Create quickPin trip
      const name = countryNames[code] || code;
      const trip: Trip = {
        id: Date.now(),
        name,
        code,
        continent: getContinent(code),
        emoji: countryFlag(code),
        start: '', end: '', days: 0, cities: '', notes: '',
        quickPin: true,
        journal: [],
      };
      setTrips(prev => [...prev, trip]);
      setVisitedCountries(prev => new Set(prev).add(code));
      if (user) {
        try {
          await saveTripToSupabase(supabase.current, user.id, trip);
        } catch (err) {
          setSaveError('Failed to save pin. Your changes may be lost on reload.');
          console.error('[Stampomad] toggleVisitedCountry save failed:', err);
        }
      }
    }
  }, [user, trips]);

  const addJournalEntry = useCallback(async (tripId: number, entry: Omit<JournalEntry, 'id'>) => {
    const fullEntry: JournalEntry = { ...entry, id: Date.now() };
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, journal: [...t.journal, fullEntry] };
    }));
    if (user) {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        try {
          await saveTripToSupabase(supabase.current, user.id, { ...trip, journal: [...trip.journal, fullEntry] });
        } catch {
          await enqueueOp({ type: 'journal_add', tripId, payload: { entry: fullEntry } });
          setPendingOps(prev => prev + 1);
          console.log('[Stampomad] Journal entry queued for offline sync');
        }
      }
    }
    trackCreate('journal');
  }, [user, trips]);

  const updateJournalEntry = useCallback(async (tripId: number, entry: JournalEntry) => {
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, journal: t.journal.map(j => j.id === entry.id ? entry : j) };
    }));
    if (user) {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        const updated = { ...trip, journal: trip.journal.map(j => j.id === entry.id ? entry : j) };
        try {
          await saveTripToSupabase(supabase.current, user.id, updated);
        } catch {
          await enqueueOp({ type: 'journal_update', tripId, payload: { entry } });
          setPendingOps(prev => prev + 1);
          console.log('[Stampomad] Journal update queued for offline sync');
        }
      }
    }
  }, [user, trips]);

  const deleteJournalEntryAction = useCallback(async (tripId: number, entryId: number) => {
    setTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, journal: t.journal.filter(j => j.id !== entryId) };
    }));
    if (user) {
      try {
        await deleteJournalEntryFromSupabase(supabase.current, user.id, entryId);
      } catch {
        await enqueueOp({ type: 'journal_delete', tripId, payload: { entryId } });
        setPendingOps(prev => prev + 1);
        console.log('[Stampomad] Journal delete queued for offline sync');
      }
    }
  }, [user]);

  const setHomebase = useCallback(async (hb: Homebase | null) => {
    setHomebaseState(hb);
    await persistSettings({ homebase: hb });
  }, [persistSettings]);

  const setLivedPlacesAction = useCallback(async (places: LivedPlace[]) => {
    setLivedPlacesState(places);
    await persistSettings({ livedPlaces: places });
  }, [persistSettings]);

  const addLivedPlace = useCallback(async (place: Omit<LivedPlace, 'id'>) => {
    const full: LivedPlace = { ...place, id: Date.now() };
    const next = [...livedPlaces, full];
    setLivedPlacesState(next);
    await persistSettings({ livedPlaces: next });
  }, [livedPlaces, persistSettings]);

  const removeLivedPlace = useCallback(async (id: number) => {
    const next = livedPlaces.filter(l => l.id !== id);
    setLivedPlacesState(next);
    await persistSettings({ livedPlaces: next });
  }, [livedPlaces, persistSettings]);

  const saveRouteAction = useCallback(async (tripId: number, route: RouteData) => {
    setRoutes(prev => ({ ...prev, [tripId]: route }));
    if (user) await saveRouteToSupabase(supabase.current, user.id, tripId, route);
    trackFeatureUsage({ feature: 'route_maps' });
  }, [user]);

  const saveTripPhotosAction = useCallback(async (tripId: number, photos: string[]) => {
    // Optimistic update — show photos immediately (base64 or URLs)
    setTripPhotos(prev => ({ ...prev, [tripId]: photos }));
    if (user) {
      await savePhotosToSupabase(supabase.current, user.id, tripId, photos);
      // Reload photos to get Storage URLs (replaces any base64 with URL)
      const fresh = await loadPhotosFromSupabase(supabase.current, user.id);
      setTripPhotos(fresh);
    }
    trackFeatureUsage({ feature: 'photo_gallery', action: 'create', metadata: { count: photos.length } });
  }, [user]);

  const setClocksAction = useCallback(async (newClocks: ClockEntry[]) => {
    setClocksState(newClocks);
    await persistSettings({ clocks: newClocks });
  }, [persistSettings]);

  const setMapboxTokenAction = useCallback(async (token: string) => {
    setMapboxTokenState(token);
    await persistSettings({ mapboxToken: token });
  }, [persistSettings]);

  const setAnthropicKeyAction = useCallback(async (key: string) => {
    setAnthropicKeyState(key);
    await persistSettings({ anthropicKey: key });
  }, [persistSettings]);

  const saveProfileAction = useCallback(async (p: UserProfile) => {
    if (!user) return;
    await saveProfileToSupabase(supabase.current, user.id, p);
    setProfile(p);
  }, [user]);

  const toggleWishlistAction = useCallback(async (code: string) => {
    const next = new Set(wishlist);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setWishlist(next);
    await persistSettings({ wishlist: next });
  }, [wishlist, persistSettings]);

  const savePackingListAction = useCallback(async (tripId: number, list: PackingList) => {
    setPackingLists(prev => ({ ...prev, [tripId]: list }));
    if (user) await savePackingListsToSupabase(supabase.current, user.id, tripId, list);
  }, [user]);

  const toggleTripPublishedAction = useCallback(async (tripId: number, published: boolean) => {
    if (!user) return;
    await setTripPublished(supabase.current, user.id, tripId, published);
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, published } : t));
    if (published) trackFeatureUsage({ feature: 'public_profile' });
  }, [user]);

  const signOutAction = useCallback(async () => {
    await supabase.current.auth.signOut();
    clearTierCache();
    setUser(null);
    setTrips([]);
    setVisitedCountries(new Set());
    setHomebaseState(null);
    setLivedPlacesState([]);
    setRoutes({});
    setTripPhotos({});
  }, []);

  return (
    <StoreContext.Provider value={{
      user, loading, saveError, clearSaveError, trips, visitedCountries, homebase, livedPlaces,
      routes, tripPhotos, clocks, mapboxToken, anthropicKey, profile, packingLists, wishlist,
      addTrip, updateTrip, deleteTrip, toggleVisitedCountry,
      addJournalEntry, updateJournalEntry, deleteJournalEntry: deleteJournalEntryAction,
      setHomebase, setLivedPlaces: setLivedPlacesAction,
      addLivedPlace, removeLivedPlace,
      saveRoute: saveRouteAction, saveTripPhotos: saveTripPhotosAction,
      setClocks: setClocksAction,
      setMapboxToken: setMapboxTokenAction,
      setAnthropicKey: setAnthropicKeyAction,
      saveProfile: saveProfileAction,
      toggleTripPublished: toggleTripPublishedAction,
      savePackingList: savePackingListAction,
      toggleWishlist: toggleWishlistAction,
      pendingOps,
      isOffline: offline,
      signOut: signOutAction,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

const defaultClocks: ClockEntry[] = [
  { tz: 'UTC', label: 'UTC', city: 'Universal' },
  { tz: 'Europe/London', label: 'London', city: 'United Kingdom' },
  { tz: 'America/New_York', label: 'New York', city: 'United States' },
  { tz: 'Asia/Tokyo', label: 'Tokyo', city: 'Japan' },
];

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

interface StoreContextType {
  user: User | null;
  loading: boolean;
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
  const [mapboxToken, setMapboxTokenState] = useState('');
  const [anthropicKey, setAnthropicKeyState] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [packingLists, setPackingLists] = useState<Record<number, PackingList>>({});
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const supabase = useRef(createClient());

  useEffect(() => {
    if (!user) { console.log('[Stampomad] No user, skipping load'); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      try {
      const sb = supabase.current;
      const userId = user!.id;
      console.log('[Stampomad] Loading data for user:', userId);

      const [tripsData, settings, routesData, photosData, profileData, packingData] = await Promise.all([
        loadTripsFromSupabase(sb, userId),
        loadSettingsFromSupabase(sb, userId),
        loadRoutesFromSupabase(sb, userId),
        loadPhotosFromSupabase(sb, userId),
        loadProfileFromSupabase(sb, userId),
        loadPackingListsFromSupabase(sb, userId),
      ]);

      if (cancelled) return;

      console.log('[Stampomad] Loaded:', tripsData.length, 'trips,', Object.keys(routesData).length, 'routes, settings:', !!settings);
      setTrips(tripsData);
      const vc = new Set<string>();
      tripsData.filter(t => t.quickPin).forEach(t => vc.add(t.code));
      setVisitedCountries(vc);

      if (settings) {
        setHomebaseState(settings.homebase);
        setLivedPlacesState(settings.livedPlaces);
        setClocksState(settings.clocks.length > 0 ? settings.clocks : defaultClocks);
        if (settings.mapboxToken) setMapboxTokenState(settings.mapboxToken);
        if (settings.anthropicKey) setAnthropicKeyState(settings.anthropicKey);
        if (settings.wishlist?.length) setWishlist(new Set(settings.wishlist));
      } else {
        setClocksState(defaultClocks);
      }

      setRoutes(routesData);
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

  const settingsRef = useRef({ homebase, livedPlaces, clocks, mapboxToken, anthropicKey, wishlist });
  settingsRef.current = { homebase, livedPlaces, clocks, mapboxToken, anthropicKey, wishlist };

  const persistSettings = useCallback(async (overrides: Partial<{
    homebase: Homebase | null; livedPlaces: LivedPlace[]; clocks: ClockEntry[];
    mapboxToken: string; anthropicKey: string; wishlist: Set<string>;
  }> = {}) => {
    if (!user) return;
    const s = settingsRef.current;
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
  }, [user]);

  const addTrip = useCallback(async (tripData: Omit<Trip, 'id' | 'journal'>) => {
    const trip: Trip = { ...tripData, id: Date.now(), journal: [] };
    setTrips(prev => [...prev, trip]);
    if (user) await saveTripToSupabase(supabase.current, user.id, trip);
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
      if (user) await saveTripToSupabase(supabase.current, user.id, trip);
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
      if (trip) await saveTripToSupabase(supabase.current, user.id, { ...trip, journal: [...trip.journal, fullEntry] });
    }
  }, [user, trips]);

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
  }, [user]);

  const saveTripPhotosAction = useCallback(async (tripId: number, photos: string[]) => {
    setTripPhotos(prev => ({ ...prev, [tripId]: photos }));
    if (user) await savePhotosToSupabase(supabase.current, user.id, tripId, photos);
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
    await saveProfileToSupabase(supabase.current, user.id, p, user.email);
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
  }, [user]);

  const signOutAction = useCallback(async () => {
    await supabase.current.auth.signOut();
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
      user, loading, trips, visitedCountries, homebase, livedPlaces,
      routes, tripPhotos, clocks, mapboxToken, anthropicKey, profile, packingLists, wishlist,
      addTrip, updateTrip, deleteTrip, toggleVisitedCountry,
      addJournalEntry,
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

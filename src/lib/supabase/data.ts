import { SupabaseClient } from '@supabase/supabase-js';
import type { Trip, JournalEntry, Homebase, LivedPlace, RouteData, ClockEntry, PackingList } from '@/types';

export async function loadTripsFromSupabase(supabase: SupabaseClient, userId: string): Promise<Trip[]> {
  const { data: tripsData, error: tripsError } = await supabase
    .from('trips').select('*').eq('user_id', userId).order('created_at');
  if (tripsError) console.error('[Stampomad] loadTrips error:', tripsError);
  if (!tripsData) return [];

  const { data: journalData, error: journalError } = await supabase
    .from('journal_entries').select('*').eq('user_id', userId);
  if (journalError) console.error('[Stampomad] loadJournal error:', journalError);

  return tripsData.map(t => ({
    id: t.id,
    name: t.name,
    code: t.code,
    continent: t.continent,
    emoji: t.emoji || '✈️',
    start: t.start_date,
    end: t.end_date || '',
    days: t.days || 1,
    cities: t.cities || '',
    notes: t.notes || '',
    quickPin: t.quick_pin,
    fromCode: t.from_code || '',
    fromCity: t.from_city || '',
    toCity: t.to_city || '',
    travelStyle: t.travel_style || '',
    rating: t.rating || 0,
    published: t.published || false,
    isGroup: t.is_group || false,
    journal: (journalData || [])
      .filter(j => j.trip_id === t.id)
      .map(j => ({ id: j.id, date: j.date, time: j.time, title: j.title, text: j.body }))
  }));
}

export async function loadSettingsFromSupabase(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_settings').select('*').eq('user_id', userId).single();
  if (error) console.error('[Stampomad] loadSettings error:', error);
  if (!data) return null;
  return {
    homebase: data.homebase as Homebase | null,
    livedPlaces: (data.lived_places || []) as LivedPlace[],
    clocks: (data.clocks || []) as ClockEntry[],
    lang: data.lang || 'en',
    translations: data.translations || {},
    mapboxToken: data.mapbox_token || '',
    anthropicKey: data.anthropic_key || '',
    wishlist: (data.wishlist || []) as string[],
  };
}

export async function loadRoutesFromSupabase(supabase: SupabaseClient, userId: string): Promise<Record<number, RouteData>> {
  const { data, error } = await supabase.from('routes').select('*').eq('user_id', userId);
  if (error) console.error('[Stampomad] loadRoutes error:', error);
  if (!data) return {};
  const routes: Record<number, RouteData> = {};
  data.forEach(r => { routes[r.trip_id] = { waypoints: r.waypoints || [], notes: r.notes || '' }; });
  return routes;
}

export async function loadPhotosFromSupabase(supabase: SupabaseClient, userId: string): Promise<Record<number, string[]>> {
  // Only select URL column (lightweight — no base64 blobs)
  const { data, error } = await supabase
    .from('trip_photos').select('trip_id, photo_url').eq('user_id', userId).not('photo_url', 'is', null);

  if (error) console.error('[Stampomad] loadPhotos error:', error);

  // Also load any legacy base64 photos (photo_url is null but photo_data exists)
  const { data: legacyData } = await supabase
    .from('trip_photos').select('trip_id, photo_data').eq('user_id', userId).is('photo_url', null);

  const photos: Record<number, string[]> = {};

  // Modern URL-based photos
  if (data) {
    data.forEach(p => {
      if (!p.photo_url) return;
      if (!photos[p.trip_id]) photos[p.trip_id] = [];
      photos[p.trip_id].push(p.photo_url);
    });
  }

  // Legacy base64 photos (will be migrated on next save)
  if (legacyData) {
    legacyData.forEach(p => {
      if (!p.photo_data) return;
      if (!photos[p.trip_id]) photos[p.trip_id] = [];
      photos[p.trip_id].push(p.photo_data);
    });
  }

  const totalPhotos = Object.values(photos).reduce((a, b) => a + b.length, 0);
  console.log('[Stampomad] loadPhotos:', Object.keys(photos).length, 'trips,', totalPhotos, 'photos');
  return photos;
}

export async function saveTripToSupabase(supabase: SupabaseClient, userId: string, trip: Trip) {
  const { error } = await supabase.from('trips').upsert({
    id: trip.id, user_id: userId,
    name: trip.name, code: trip.code, continent: trip.continent,
    emoji: trip.emoji,
    start_date: trip.start || null,
    end_date: trip.end || null,
    days: trip.days, cities: trip.cities, notes: trip.notes,
    quick_pin: trip.quickPin, from_code: trip.fromCode || '',
    from_city: trip.fromCity || '', to_city: trip.toCity || '',
    travel_style: trip.travelStyle || '', rating: trip.rating || 0,
    published: trip.published || false,
  });
  if (error) {
    console.error('[Stampomad] saveTrip error:', error);
    throw new Error(`Failed to save trip: ${error.message}`);
  }
  for (const j of trip.journal || []) {
    const { error: jErr } = await supabase.from('journal_entries').upsert({
      id: j.id, user_id: userId, trip_id: trip.id,
      date: j.date, time: j.time, title: j.title, body: j.text,
    });
    if (jErr) console.error('[Stampomad] saveJournal error:', jErr);
  }
}

export async function deleteTripFromSupabase(supabase: SupabaseClient, userId: string, tripId: number) {
  await supabase.from('journal_entries').delete().eq('user_id', userId).eq('trip_id', tripId);
  // Delete photos from Storage bucket first
  const { deleteAllTripPhotos } = await import('./storage');
  await deleteAllTripPhotos(supabase, userId, tripId).catch(() => {});
  await supabase.from('trip_photos').delete().eq('user_id', userId).eq('trip_id', tripId);
  await supabase.from('routes').delete().eq('user_id', userId).eq('trip_id', tripId);
  await supabase.from('trips').delete().eq('user_id', userId).eq('id', tripId);
}

export async function saveSettingsToSupabase(
  supabase: SupabaseClient,
  userId: string,
  settings: {
    homebase: Homebase | null;
    livedPlaces: LivedPlace[];
    clocks: ClockEntry[];
    lang: string;
    translations: Record<string, Record<string, string>>;
    mapboxToken: string;
    anthropicKey: string;
    wishlist?: string[];
  }
) {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    homebase: settings.homebase,
    lived_places: settings.livedPlaces,
    clocks: settings.clocks,
    lang: settings.lang,
    translations: settings.translations,
    mapbox_token: settings.mapboxToken || null,
    anthropic_key: settings.anthropicKey || null,
    wishlist: settings.wishlist || [],
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[Stampomad] saveSettings error:', error);
    throw new Error(`Failed to save settings: ${error.message}`);
  } else {
    console.log('[Stampomad] Settings saved');
  }
}

export async function saveRouteToSupabase(supabase: SupabaseClient, userId: string, tripId: number, route: RouteData) {
  await supabase.from('routes').delete().eq('user_id', userId).eq('trip_id', tripId);
  const { error } = await supabase.from('routes').insert({
    user_id: userId, trip_id: tripId,
    waypoints: route.waypoints, notes: route.notes,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[Stampomad] saveRoute error:', error);
  else console.log('[Stampomad] Route saved for trip', tripId, '—', route.waypoints.length, 'waypoints');
}

export async function savePhotosToSupabase(supabase: SupabaseClient, userId: string, tripId: number, photos: string[]) {
  // Separate existing Storage URLs from new base64 data
  const isStorageUrl = (p: string) => p.startsWith('http');

  // Delete removed photos from DB and Storage
  const { data: existing } = await supabase
    .from('trip_photos').select('id, photo_url, photo_data').eq('user_id', userId).eq('trip_id', tripId);

  const existingUrls = new Set(photos.filter(isStorageUrl));
  if (existing) {
    for (const row of existing) {
      const url = row.photo_url || row.photo_data;
      if (!existingUrls.has(url)) {
        // Photo was removed — delete DB row
        await supabase.from('trip_photos').delete().eq('id', row.id);
        // Delete from Storage if it was a URL
        if (row.photo_url) {
          const { deletePhotoFromStorage } = await import('./storage');
          await deletePhotoFromStorage(supabase, row.photo_url);
        }
      }
    }
  }

  // Upload new base64 photos to Storage, keep existing URLs
  const { uploadPhoto } = await import('./storage');
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (isStorageUrl(photo)) {
      // Existing Storage URL — update position only
      await supabase.from('trip_photos').update({ position: i })
        .eq('user_id', userId).eq('trip_id', tripId).eq('photo_url', photo);
    } else {
      // New base64 photo — upload to Storage
      const url = await uploadPhoto(supabase, userId, tripId, photo, i);
      if (url) {
        await supabase.from('trip_photos').insert({
          user_id: userId, trip_id: tripId,
          photo_url: url, position: i,
        });
      }
    }
  }
}

export async function deleteJournalEntryFromSupabase(supabase: SupabaseClient, userId: string, entryId: number) {
  await supabase.from('journal_entries').delete().eq('user_id', userId).eq('id', entryId);
}

// ── Profile management ──

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  homebase: Homebase | null;
}

export async function loadProfileFromSupabase(supabase: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles').select('*').eq('user_id', userId).single();
  if (error || !data) return null;
  return {
    username: data.username,
    displayName: data.display_name || '',
    bio: data.bio || '',
    avatarUrl: data.avatar_url || null,
    homebase: data.homebase as Homebase | null,
  };
}

export async function saveProfileToSupabase(supabase: SupabaseClient, userId: string, profile: UserProfile) {
  const { error } = await supabase.from('user_profiles').upsert({
    user_id: userId,
    username: profile.username,
    display_name: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    homebase: profile.homebase,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function checkUsernameAvailable(supabase: SupabaseClient, username: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase.from('user_profiles').select('user_id').eq('username', username);
  if (excludeUserId) query = query.neq('user_id', excludeUserId);
  const { data } = await query;
  return !data || data.length === 0;
}

export async function setTripPublished(supabase: SupabaseClient, userId: string, tripId: number, published: boolean) {
  await supabase.from('trips').update({ published }).eq('user_id', userId).eq('id', tripId);
}

// ── Public data (no auth required, RLS handles access) ──

// ── Packing Lists ──

export async function loadPackingListsFromSupabase(supabase: SupabaseClient, userId: string): Promise<Record<number, PackingList>> {
  try {
    const { data } = await supabase
      .from('user_settings').select('packing_lists').eq('user_id', userId).single();
    if (!data?.packing_lists) return {};
    return data.packing_lists as Record<number, PackingList>;
  } catch {
    // Column may not exist yet — fall back to empty
    return {};
  }
}

export async function savePackingListsToSupabase(supabase: SupabaseClient, userId: string, tripId: number, list: PackingList) {
  try {
    // Load existing, merge, save back
    const { data } = await supabase
      .from('user_settings').select('packing_lists').eq('user_id', userId).single();
    const existing = (data?.packing_lists || {}) as Record<number, PackingList>;
    existing[tripId] = list;
    const { error } = await supabase.from('user_settings').update({
      packing_lists: existing,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    if (error) console.error('[Stampomad] savePackingLists error:', error);
  } catch (err) {
    console.error('[Stampomad] savePackingLists error:', err);
  }
}

export async function loadPublicProfile(supabase: SupabaseClient, username: string): Promise<(UserProfile & { userId: string }) | null> {
  const { data, error } = await supabase
    .from('user_profiles').select('*').eq('username', username).single();
  if (error || !data) return null;
  return {
    userId: data.user_id,
    username: data.username,
    displayName: data.display_name || '',
    bio: data.bio || '',
    avatarUrl: data.avatar_url || null,
    homebase: data.homebase as Homebase | null,
  };
}

export async function loadPublicMapboxToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.rpc('get_user_mapbox_token', { target_user_id: userId });
  return data || '';
}

export async function loadPublicStats(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc('get_user_stats', { target_user_id: userId });
  if (error || !data) return { countries: 0, trips: 0, days: 0, entries: 0 };
  return {
    countries: data.countries || 0,
    trips: data.trips || 0,
    days: data.days || 0,
    entries: data.entries || 0,
  };
}

export async function loadPublicTrips(supabase: SupabaseClient, userId: string): Promise<Trip[]> {
  const { data: tripsData } = await supabase
    .from('trips').select('*').eq('user_id', userId).eq('published', true).order('start_date', { ascending: false });
  if (!tripsData) return [];

  const tripIds = tripsData.map(t => t.id);
  const { data: journalData } = await supabase
    .from('journal_entries').select('*').eq('user_id', userId).in('trip_id', tripIds);

  return tripsData.map(t => ({
    id: t.id,
    name: t.name,
    code: t.code,
    continent: t.continent,
    emoji: t.emoji || '✈️',
    start: t.start_date,
    end: t.end_date || '',
    days: t.days || 1,
    cities: t.cities || '',
    notes: t.notes || '',
    quickPin: t.quick_pin,
    fromCode: t.from_code || '',
    fromCity: t.from_city || '',
    toCity: t.to_city || '',
    travelStyle: t.travel_style || '',
    rating: t.rating || 0,
    published: true,
    journal: (journalData || [])
      .filter(j => j.trip_id === t.id)
      .map(j => ({ id: j.id, date: j.date, time: j.time, title: j.title, text: j.body })),
  }));
}

export async function loadPublicRoutes(supabase: SupabaseClient, userId: string, tripIds: number[]): Promise<Record<number, RouteData>> {
  if (tripIds.length === 0) return {};
  const { data } = await supabase.from('routes').select('*').eq('user_id', userId).in('trip_id', tripIds);
  if (!data) return {};
  const routes: Record<number, RouteData> = {};
  data.forEach(r => { routes[r.trip_id] = { waypoints: r.waypoints || [], notes: r.notes || '' }; });
  return routes;
}

export async function loadPublicPhotos(supabase: SupabaseClient, userId: string, tripIds: number[]): Promise<Record<number, string[]>> {
  if (tripIds.length === 0) return {};

  // Load URL-based photos (lightweight)
  const { data } = await supabase
    .from('trip_photos').select('trip_id, photo_url')
    .eq('user_id', userId).in('trip_id', tripIds).not('photo_url', 'is', null)
    .order('position');

  // Fallback: legacy base64 photos
  const { data: legacyData } = await supabase
    .from('trip_photos').select('trip_id, photo_data')
    .eq('user_id', userId).in('trip_id', tripIds).is('photo_url', null);

  const photos: Record<number, string[]> = {};
  if (data) {
    data.forEach(p => {
      if (!p.photo_url) return;
      if (!photos[p.trip_id]) photos[p.trip_id] = [];
      photos[p.trip_id].push(p.photo_url);
    });
  }
  if (legacyData) {
    legacyData.forEach(p => {
      if (!p.photo_data) return;
      if (!photos[p.trip_id]) photos[p.trip_id] = [];
      photos[p.trip_id].push(p.photo_data);
    });
  }
  return photos;
}

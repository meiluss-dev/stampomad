import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache for 3 minutes
let cache: { data: unknown; ts: number } | null = null;
const TTL = 3 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const continent = searchParams.get('continent') || '';
  const search = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'recent'; // recent | longest | popular
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 12;

  // Use cache only for unfiltered first page
  const isCacheable = !continent && !search && sort === 'recent' && page === 1;
  if (isCacheable && cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  // --- Published trips with filters ---
  let query = supabase
    .from('trips')
    .select('id, name, code, continent, emoji, start_date, end_date, days, cities, user_id, created_at', { count: 'exact' })
    .eq('published', true)
    .eq('quick_pin', false);

  if (continent) {
    query = query.eq('continent', continent);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,cities.ilike.%${search}%,code.ilike.%${search}%`);
  }

  // Sort
  if (sort === 'longest') {
    query = query.order('days', { ascending: false, nullsFirst: false });
  } else if (sort === 'popular') {
    query = query.order('created_at', { ascending: false }); // fallback, could use views later
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range((page - 1) * limit, page * limit - 1);

  const { data: publishedTrips, count } = await query;

  // Get profiles for trip owners
  const ownerIds = [...new Set((publishedTrips || []).map(t => t.user_id))];
  const { data: profiles } = ownerIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', ownerIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  const trips = (publishedTrips || []).map(t => {
    const profile = profileMap.get(t.user_id);
    return {
      id: t.id,
      name: t.name,
      code: t.code,
      continent: t.continent,
      emoji: t.emoji || '✈️',
      start: t.start_date,
      end: t.end_date,
      days: t.days || 0,
      cities: t.cities || '',
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
    };
  });

  // --- Leaderboard: top travelers by country count ---
  const { data: allTrips } = await supabase
    .from('trips')
    .select('code, user_id');

  const userCountrySets: Record<string, Set<string>> = {};
  const userTripCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};

  if (allTrips) {
    for (const t of allTrips) {
      if (!userCountrySets[t.user_id]) userCountrySets[t.user_id] = new Set();
      userCountrySets[t.user_id].add(t.code);
      userTripCounts[t.user_id] = (userTripCounts[t.user_id] || 0) + 1;
      countryCounts[t.code] = (countryCounts[t.code] || 0) + 1;
    }
  }

  // Get profiles for top travelers
  const topUserIds = Object.entries(userCountrySets)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10)
    .map(([uid]) => uid);

  const { data: topProfiles } = topUserIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', topUserIds)
    : { data: [] };

  const topProfileMap = new Map((topProfiles || []).map(p => [p.user_id, p]));

  const leaderboard = topUserIds.map(uid => {
    const profile = topProfileMap.get(uid);
    const countries = userCountrySets[uid]?.size || 0;
    // Count unique continents
    const continents = new Set<string>();
    if (userCountrySets[uid]) {
      // We'll approximate continents from the trip data
    }
    return {
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
      countries,
      trips: userTripCounts[uid] || 0,
    };
  }).filter(u => u.username); // Only show users with public profiles

  // --- Top destinations ---
  const topDestinations = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code, count]) => ({ code, count }));

  const result = {
    trips,
    visitedCodes: Object.keys(countryCounts),
    countryCounts,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    leaderboard,
    topDestinations,
    stats: {
      totalCountries: Object.keys(countryCounts).length,
      totalTrips: allTrips?.length || 0,
      totalTravelers: Object.keys(userCountrySets).length,
    },
  };

  if (isCacheable) {
    cache = { data: result, ts: Date.now() };
  }

  return NextResponse.json(result);
}

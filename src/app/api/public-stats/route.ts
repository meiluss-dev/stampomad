import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache for 5 minutes
let cache: { data: unknown; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  // Get all unique country codes across all users (from non-quickpin trips + quickpin)
  const { data: trips } = await supabase
    .from('trips')
    .select('code, user_id, quick_pin');

  const countryCounts: Record<string, number> = {};
  const userCountries: Record<string, Set<string>> = {};
  let totalTrips = 0;
  let totalUsers = 0;

  if (trips) {
    const users = new Set<string>();
    for (const t of trips) {
      users.add(t.user_id);
      if (!userCountries[t.user_id]) userCountries[t.user_id] = new Set();
      userCountries[t.user_id].add(t.code);
      countryCounts[t.code] = (countryCounts[t.code] || 0) + 1;
      if (!t.quick_pin) totalTrips++;
    }
    totalUsers = users.size;
  }

  // Unique countries visited by anyone
  const visitedCodes = Object.keys(countryCounts);

  // Get recent published trips with user profile info
  const { data: publishedTrips } = await supabase
    .from('trips')
    .select('id, name, code, continent, emoji, start_date, end_date, days, cities, user_id')
    .eq('published', true)
    .eq('quick_pin', false)
    .order('created_at', { ascending: false })
    .limit(8);

  // Get profile info for these trip owners
  const ownerIds = [...new Set((publishedTrips || []).map(t => t.user_id))];
  const { data: profiles } = ownerIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', ownerIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  // Build recent trips (skip base64 photos to keep response small)
  const recentTrips = (publishedTrips || []).map(t => {
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

  const result = {
    visitedCodes,
    countryCounts,
    totalCountries: visitedCodes.length,
    totalTrips,
    totalUsers,
    recentTrips,
  };

  cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}

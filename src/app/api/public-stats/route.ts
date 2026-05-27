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

  const result = {
    visitedCodes,
    countryCounts,
    totalCountries: visitedCodes.length,
    totalTrips,
    totalUsers,
  };

  cache = { data: result, ts: Date.now() };
  return NextResponse.json(result);
}

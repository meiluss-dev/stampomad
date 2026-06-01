import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET group trips the current user is an accepted member of (not owner)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Step 1: Get trip IDs where user is an accepted member
  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .eq('role', 'member');

  if (!memberships || memberships.length === 0) return NextResponse.json([]);

  const tripIds = memberships.map(m => m.trip_id);

  // Step 2: Use admin client to read trips (bypasses RLS)
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: trips } = await admin
    .from('trips')
    .select('id, name, code, emoji, start_date, end_date, days, cities, continent')
    .in('id', tripIds);

  const result = (trips || []).map(t => ({
    id: t.id,
    name: t.name,
    code: t.code,
    emoji: t.emoji || '✈️',
    start: t.start_date,
    end: t.end_date || '',
    days: t.days || 1,
    cities: t.cities || '',
    continent: t.continent || '',
  }));

  return NextResponse.json(result);
}

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GET all members of a trip (if the current user is a member or owner)
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get('tripId');
  if (!tripId) return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify user is a member or the trip owner
  const { data: membership } = await admin
    .from('trip_members')
    .select('id')
    .eq('trip_id', Number(tripId))
    .eq('user_id', user.id)
    .limit(1);

  const { data: trip } = await admin
    .from('trips')
    .select('user_id')
    .eq('id', Number(tripId))
    .single();

  const isMember = membership && membership.length > 0;
  const isOwner = trip?.user_id === user.id;

  if (!isMember && !isOwner) {
    return NextResponse.json({ error: 'Not a member of this trip' }, { status: 403 });
  }

  // Load all members with profile info
  const { data: members } = await admin
    .from('trip_members')
    .select('id, trip_id, user_id, role, status, joined_at')
    .eq('trip_id', Number(tripId));

  if (!members) return NextResponse.json([]);

  // Load profiles for all member user IDs
  const userIds = members.map(m => m.user_id);
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, username, display_name, avatar_url')
    .in('user_id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  const result = members.map(m => {
    const p = profileMap.get(m.user_id);
    return {
      id: m.id,
      tripId: m.trip_id,
      userId: m.user_id,
      role: m.role,
      status: m.status,
      joinedAt: m.joined_at,
      displayName: p?.display_name || p?.username || 'Unknown',
      avatarUrl: p?.avatar_url || null,
      username: p?.username || '',
    };
  });

  return NextResponse.json(result);
}

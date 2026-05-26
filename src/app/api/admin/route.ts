import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function isAdmin() {
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId) { console.error('[Admin] ADMIN_USER_ID env var not set'); return false; }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) { console.error('[Admin] auth error:', error.message); return false; }
  if (!user) { console.error('[Admin] no user in session'); return false; }
  return user.id === adminId;
}

export async function GET(request: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'overview': return NextResponse.json(await getOverview(admin));
      case 'users': return NextResponse.json(await getUsers(admin, searchParams));
      case 'growth': return NextResponse.json(await getGrowth(admin));
      case 'engagement': return NextResponse.json(await getEngagement(admin));
      case 'emails': return NextResponse.json(await getEmails(admin, searchParams));
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Admin]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── Overview KPIs ──
async function getOverview(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Total users
  const { count: totalUsers } = await admin.from('user_profiles').select('*', { count: 'exact', head: true });

  // Users with profiles (have set username)
  const { count: profiledUsers } = await admin.from('user_profiles').select('*', { count: 'exact', head: true }).not('username', 'is', null);

  // Signups today
  const { count: signupsToday } = await admin.from('user_profiles').select('*', { count: 'exact', head: true }).gte('updated_at', todayStr);

  // Signups this week
  const { count: signupsWeek } = await admin.from('user_profiles').select('*', { count: 'exact', head: true }).gte('updated_at', weekAgo);

  // Signups this month
  const { count: signupsMonth } = await admin.from('user_profiles').select('*', { count: 'exact', head: true }).gte('updated_at', monthAgo);

  // Total trips
  const { count: totalTrips } = await admin.from('trips').select('*', { count: 'exact', head: true }).eq('quick_pin', false);

  // Total journal entries
  const { count: totalEntries } = await admin.from('journal_entries').select('*', { count: 'exact', head: true });

  // Group trips
  const { count: groupTrips } = await admin.from('trips').select('*', { count: 'exact', head: true }).eq('is_group', true);

  // Total countries pinned (distinct)
  const { data: tripCodes } = await admin.from('trips').select('code').eq('quick_pin', true);
  const uniqueCountries = new Set((tripCodes || []).map(t => t.code)).size;

  return {
    totalUsers: totalUsers || 0,
    profiledUsers: profiledUsers || 0,
    signupsToday: signupsToday || 0,
    signupsWeek: signupsWeek || 0,
    signupsMonth: signupsMonth || 0,
    totalTrips: totalTrips || 0,
    totalEntries: totalEntries || 0,
    groupTrips: groupTrips || 0,
    uniqueCountries,
  };
}

// ── User list ──
async function getUsers(admin: ReturnType<typeof createAdminClient>, params: URLSearchParams) {
  const search = params.get('search') || '';
  const page = parseInt(params.get('page') || '0');
  const limit = 50;

  let query = admin
    .from('user_profiles')
    .select('user_id, username, display_name, email, avatar_url, bio, updated_at')
    .order('updated_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: users, count } = await query;

  // Get trip counts per user
  const userIds = (users || []).map(u => u.user_id);
  let tripCounts: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: trips } = await admin
      .from('trips')
      .select('user_id')
      .in('user_id', userIds)
      .eq('quick_pin', false);
    (trips || []).forEach(t => { tripCounts[t.user_id] = (tripCounts[t.user_id] || 0) + 1; });
  }

  // Get country pin counts per user
  let countryCounts: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: pins } = await admin
      .from('trips')
      .select('user_id')
      .in('user_id', userIds)
      .eq('quick_pin', true);
    (pins || []).forEach(t => { countryCounts[t.user_id] = (countryCounts[t.user_id] || 0) + 1; });
  }

  return {
    users: (users || []).map(u => ({
      ...u,
      tripCount: tripCounts[u.user_id] || 0,
      countryCount: countryCounts[u.user_id] || 0,
    })),
    total: count || 0,
    page,
  };
}

// ── Growth (signups over time) ──
async function getGrowth(admin: ReturnType<typeof createAdminClient>) {
  // Get all users ordered by creation
  const { data } = await admin
    .from('user_profiles')
    .select('updated_at')
    .order('updated_at');

  const byDay: Record<string, number> = {};
  (data || []).forEach(u => {
    const day = u.updated_at?.split('T')[0] || 'unknown';
    byDay[day] = (byDay[day] || 0) + 1;
  });

  // Cumulative
  let cumulative = 0;
  const points = Object.entries(byDay).sort().map(([date, count]) => {
    cumulative += count;
    return { date, signups: count, total: cumulative };
  });

  return { points };
}

// ── Engagement metrics ──
async function getEngagement(admin: ReturnType<typeof createAdminClient>) {
  // Users with most trips
  const { data: allTrips } = await admin
    .from('trips')
    .select('user_id, name')
    .eq('quick_pin', false);

  const tripsByUser: Record<string, number> = {};
  (allTrips || []).forEach(t => { tripsByUser[t.user_id] = (tripsByUser[t.user_id] || 0) + 1; });

  const topUserIds = Object.entries(tripsByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  let powerUsers: { display_name: string; username: string; trips: number }[] = [];
  if (topUserIds.length > 0) {
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, display_name, username')
      .in('user_id', topUserIds);
    powerUsers = topUserIds.map(id => {
      const p = (profiles || []).find(p => p.user_id === id);
      return {
        display_name: p?.display_name || 'Unknown',
        username: p?.username || '',
        trips: tripsByUser[id],
      };
    });
  }

  // Users with no trips
  const { data: allUsers } = await admin.from('user_profiles').select('user_id');
  const usersWithTrips = new Set(Object.keys(tripsByUser));
  const inactiveCount = (allUsers || []).filter(u => !usersWithTrips.has(u.user_id)).length;

  // Average trips per active user
  const activeUserCount = usersWithTrips.size;
  const totalTripCount = (allTrips || []).length;
  const avgTrips = activeUserCount > 0 ? (totalTripCount / activeUserCount).toFixed(1) : '0';

  return {
    powerUsers,
    inactiveCount,
    activeUserCount,
    avgTrips,
    totalUsers: (allUsers || []).length,
  };
}

// ── Email list ──
async function getEmails(admin: ReturnType<typeof createAdminClient>, params: URLSearchParams) {
  const format = params.get('format');

  const { data } = await admin
    .from('user_profiles')
    .select('display_name, email, username, updated_at')
    .not('email', 'is', null)
    .order('updated_at', { ascending: false });

  if (format === 'csv') {
    const csv = [
      'Name,Email,Username,Signed Up',
      ...(data || []).map(u =>
        `"${u.display_name || ''}","${u.email}","${u.username || ''}","${u.updated_at?.split('T')[0] || ''}"`
      ),
    ].join('\n');
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=stampomad-emails.csv' },
    });
  }

  return { emails: data || [], total: (data || []).length };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';

type Tab = 'overview' | 'users' | 'emails' | 'engagement' | 'features' | 'tiers';

interface Overview {
  totalUsers: number;
  profiledUsers: number;
  signupsToday: number;
  signupsWeek: number;
  signupsMonth: number;
  totalTrips: number;
  totalEntries: number;
  groupTrips: number;
  uniqueCountries: number;
}

interface UserRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  updated_at: string;
  tripCount: number;
  countryCount: number;
}

interface GrowthPoint {
  date: string;
  signups: number;
  total: number;
}

interface Engagement {
  powerUsers: { display_name: string; username: string; trips: number }[];
  inactiveCount: number;
  activeUserCount: number;
  avgTrips: string;
  totalUsers: number;
}

interface EmailRow {
  display_name: string | null;
  email: string;
  username: string | null;
  updated_at: string;
}

interface FeatureUsageItem {
  feature: string;
  totalEvents: number;
  uniqueUsers: number;
  actions: Record<string, number>;
  gateHits: number;
}

interface FeatureUsageData {
  period: string;
  totalEvents: number;
  features: FeatureUsageItem[];
  dailyTrend: { date: string; count: number }[];
}

interface TierData {
  breakdown: Record<string, number>;
  total: number;
}

export default function AdminPage() {
  const { user } = useStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Overview
  const [overview, setOverview] = useState<Overview | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Engagement
  const [engagement, setEngagement] = useState<Engagement | null>(null);

  // Emails
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [emailSearch, setEmailSearch] = useState('');

  // Feature Usage
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageData | null>(null);

  // Tiers
  const [tierData, setTierData] = useState<TierData | null>(null);

  const fetchApi = useCallback(async (action: string, extra = '') => {
    const res = await fetch(`/api/admin?action=${action}${extra}`);
    if (res.status === 401) { setAuthorized(false); return null; }
    setAuthorized(true);
    return res.json();
  }, []);

  // Load overview on mount
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchApi('overview'), fetchApi('growth')]).then(([o, g]) => {
      if (o) setOverview(o);
      if (g) setGrowth(g.points || []);
    });
  }, [user, fetchApi]);

  // Load tab data
  useEffect(() => {
    if (!authorized) return;
    if (tab === 'users') {
      fetchApi('users', `&search=${encodeURIComponent(userSearch)}&page=${userPage}`).then(d => {
        if (d) setUsers(d.users || []);
      });
    } else if (tab === 'engagement') {
      fetchApi('engagement').then(d => { if (d) setEngagement(d); });
    } else if (tab === 'emails') {
      fetchApi('emails').then(d => { if (d) setEmails(d.emails || []); });
    } else if (tab === 'features') {
      fetchApi('feature-usage', '&days=30').then(d => { if (d) setFeatureUsage(d); });
    } else if (tab === 'tiers') {
      fetchApi('tiers').then(d => { if (d) setTierData(d); });
    }
  }, [tab, authorized, userSearch, userPage, fetchApi]);

  if (authorized === null) {
    return <div className="flex items-center justify-center py-20"><div className="text-text-muted">Loading...</div></div>;
  }

  if (authorized === false) {
    return (
      <div className="flex items-center justify-center py-20 text-center">
        <div>
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-[family-name:var(--font-playfair)] mb-2">Access Denied</h1>
          <p className="text-text-muted text-sm">This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'emails', label: 'Email List', icon: '📧' },
    { key: 'engagement', label: 'Engagement', icon: '📈' },
    { key: 'features', label: 'Feature Usage', icon: '🔥' },
    { key: 'tiers', label: 'Tiers', icon: '💎' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-text-muted uppercase tracking-[2px] mb-1">Administration</div>
          <h1 className="text-[26px] sm:text-[32px]">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stamp-green bg-stamp-green/10 border border-stamp-green/20 rounded-md px-2 py-0.5 uppercase tracking-wider">Admin</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm cursor-pointer transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-gold text-bg font-medium'
                : 'text-text-muted hover:text-text hover:bg-white/[0.04]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab overview={overview} growth={growth} />}
      {tab === 'users' && (
        <UsersTab
          users={users}
          search={userSearch}
          onSearch={s => { setUserSearch(s); setUserPage(0); }}
          page={userPage}
          onPage={setUserPage}
          selected={selectedUser}
          onSelect={setSelectedUser}
        />
      )}
      {tab === 'emails' && <EmailsTab emails={emails} search={emailSearch} onSearch={setEmailSearch} />}
      {tab === 'engagement' && <EngagementTab engagement={engagement} />}
      {tab === 'features' && <FeatureUsageTab data={featureUsage} />}
      {tab === 'tiers' && <TiersTab data={tierData} />}
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ overview, growth }: { overview: Overview | null; growth: GrowthPoint[] }) {
  if (!overview) return <div className="text-text-muted text-sm animate-pulse">Loading metrics...</div>;

  const kpis = [
    { label: 'Total Users', value: overview.totalUsers, icon: '👥', color: 'gold' },
    { label: 'With Profiles', value: overview.profiledUsers, icon: '✅', color: 'teal' },
    { label: 'Today', value: overview.signupsToday, icon: '📅', color: 'stamp-green' },
    { label: 'This Week', value: overview.signupsWeek, icon: '📆', color: 'stamp-blue' },
    { label: 'This Month', value: overview.signupsMonth, icon: '📊', color: 'stamp-red' },
    { label: 'Total Trips', value: overview.totalTrips, icon: '✈️', color: 'gold' },
    { label: 'Journal Entries', value: overview.totalEntries, icon: '📝', color: 'teal' },
    { label: 'Group Trips', value: overview.groupTrips, icon: '👥', color: 'stamp-blue' },
  ];

  const maxTotal = growth.length > 0 ? growth[growth.length - 1].total : 1;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-bg3 border border-white/[0.08] rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px]`} style={{ background: `var(--color-${k.color})` }} />
            <div className="absolute right-3 top-3 text-xl opacity-20">{k.icon}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{k.label}</div>
            <div className="font-[family-name:var(--font-playfair)] text-2xl">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      {growth.length > 1 && (
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">User Growth</h3>
          <div className="flex items-end gap-[2px] h-32">
            {growth.slice(-60).map((p, i) => {
              const pct = (p.total / maxTotal) * 100;
              return (
                <div key={i} className="flex-1 group relative">
                  <div
                    className="bg-gold/60 hover:bg-gold rounded-t transition-colors w-full"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-bg2 border border-white/[0.12] rounded-lg px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mb-1 z-10">
                    {p.date}: +{p.signups} ({p.total} total)
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-2">
            <span>{growth.slice(-60)[0]?.date}</span>
            <span>{growth[growth.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Users Tab ──
function UsersTab({
  users, search, onSearch, page, onPage, selected, onSelect,
}: {
  users: UserRow[];
  search: string;
  onSearch: (s: string) => void;
  page: number;
  onPage: (p: number) => void;
  selected: UserRow | null;
  onSelect: (u: UserRow | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search users by name, username, or email..."
          className="flex-1 bg-bg3 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-gold transition-colors placeholder:text-text-muted"
        />
        <div className="text-xs text-text-muted shrink-0">Page {page + 1}</div>
      </div>

      {/* User detail panel */}
      {selected && (
        <div className="bg-bg3 border-2 border-gold/30 rounded-2xl p-5 relative">
          <button onClick={() => onSelect(null)} className="absolute top-3 right-3 text-text-muted hover:text-text cursor-pointer text-lg">×</button>
          <div className="flex items-center gap-4 mb-4">
            {selected.avatar_url ? (
              <img src={selected.avatar_url} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gold text-bg flex items-center justify-center text-xl font-semibold">
                {(selected.display_name || selected.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-medium">{selected.display_name || 'No name'}</div>
              {selected.username && <div className="text-sm text-text-muted">@{selected.username}</div>}
              {selected.email && <div className="text-sm text-text-muted">{selected.email}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Trips" value={selected.tripCount} />
            <Stat label="Countries" value={selected.countryCount} />
            <Stat label="Has Profile" value={selected.username ? 'Yes' : 'No'} />
            <Stat label="Signed Up" value={selected.updated_at?.split('T')[0] || '—'} />
          </div>
          {selected.bio && <div className="mt-3 text-sm text-text-muted bg-bg4 rounded-xl p-3">{selected.bio}</div>}
        </div>
      )}

      {/* User table */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-[11px] text-text-muted uppercase tracking-wider">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-center">Trips</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Countries</th>
                <th className="px-4 py-3 hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr
                  key={u.user_id}
                  onClick={() => onSelect(u)}
                  className="border-b border-white/[0.04] hover:bg-bg4 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bg4 flex items-center justify-center text-xs font-semibold shrink-0">
                          {(u.display_name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.display_name || 'No name'}</div>
                        {u.username && <div className="text-[11px] text-text-muted">@{u.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-[13px] hidden sm:table-cell">{u.email || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`${u.tripCount > 0 ? 'text-gold' : 'text-text-muted'}`}>{u.tripCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className={`${u.countryCount > 0 ? 'text-teal' : 'text-text-muted'}`}>{u.countryCount}</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-[12px] hidden md:table-cell">{u.updated_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">No users found</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs cursor-pointer disabled:opacity-30 hover:border-white/20 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={users.length < 50}
          className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs cursor-pointer disabled:opacity-30 hover:border-white/20 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Email List Tab ──
function EmailsTab({ emails, search, onSearch }: { emails: EmailRow[]; search: string; onSearch: (s: string) => void }) {
  const filtered = search
    ? emails.filter(e =>
        e.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.username?.toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Filter emails..."
          className="flex-1 bg-bg3 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-gold transition-colors placeholder:text-text-muted"
        />
        <a
          href="/api/admin?action=emails&format=csv"
          className="px-4 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium hover:opacity-85 transition-all shrink-0"
        >
          Export CSV
        </a>
      </div>

      <div className="text-xs text-text-muted">{filtered.length} email{filtered.length !== 1 ? 's' : ''}</div>

      <div className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-[11px] text-text-muted uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 hidden sm:table-cell">Username</th>
                <th className="px-4 py-3 hidden md:table-cell">Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="px-4 py-2.5">{e.display_name || '—'}</td>
                  <td className="px-4 py-2.5 text-teal">{e.email}</td>
                  <td className="px-4 py-2.5 text-text-muted hidden sm:table-cell">{e.username ? `@${e.username}` : '—'}</td>
                  <td className="px-4 py-2.5 text-text-muted text-[12px] hidden md:table-cell">{e.updated_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">No emails found</div>
        )}
      </div>
    </div>
  );
}

// ── Engagement Tab ──
function EngagementTab({ engagement }: { engagement: Engagement | null }) {
  if (!engagement) return <div className="text-text-muted text-sm animate-pulse">Loading engagement data...</div>;

  const activePct = engagement.totalUsers > 0
    ? Math.round((engagement.activeUserCount / engagement.totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Active Users</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl">{engagement.activeUserCount}</div>
          <div className="text-[10px] text-teal mt-0.5">{activePct}% of total</div>
        </div>
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Inactive Users</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl">{engagement.inactiveCount}</div>
          <div className="text-[10px] text-stamp-red mt-0.5">No trips logged</div>
        </div>
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Avg Trips / User</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl">{engagement.avgTrips}</div>
          <div className="text-[10px] text-text-muted mt-0.5">among active users</div>
        </div>
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Conversion</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl">{activePct}%</div>
          <div className="text-[10px] text-text-muted mt-0.5">signup → active</div>
        </div>
      </div>

      {/* Power users */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Power Users (Top 10)</h3>
        <div className="space-y-2">
          {engagement.powerUsers.map((u, i) => (
            <div key={i} className="flex items-center gap-3 bg-bg4 rounded-xl px-4 py-2.5">
              <span className="text-gold font-[family-name:var(--font-playfair)] text-lg w-6 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{u.display_name}</div>
                {u.username && <div className="text-[11px] text-text-muted">@{u.username}</div>}
              </div>
              <div className="text-sm text-gold font-medium">{u.trips} trips</div>
            </div>
          ))}
          {engagement.powerUsers.length === 0 && (
            <div className="text-text-muted text-sm text-center py-4">No users with trips yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Feature Usage Tab ──
function FeatureUsageTab({ data }: { data: FeatureUsageData | null }) {
  if (!data) return <div className="text-text-muted text-sm animate-pulse">Loading feature usage...</div>;

  const maxEvents = data.features.length > 0 ? data.features[0].totalEvents : 1;
  const maxDaily = data.dailyTrend.length > 0 ? Math.max(...data.dailyTrend.map(d => d.count)) : 1;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Events</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl">{data.totalEvents.toLocaleString()}</div>
          <div className="text-[10px] text-text-muted mt-0.5">Last {data.period}</div>
        </div>
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Features Used</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl">{data.features.length}</div>
        </div>
        <div className="bg-bg3 border border-stamp-red/20 rounded-2xl p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Gate Hits</div>
          <div className="font-[family-name:var(--font-playfair)] text-2xl text-stamp-red">
            {data.features.reduce((a, f) => a + f.gateHits, 0)}
          </div>
          <div className="text-[10px] text-stamp-red mt-0.5">Premium demand signal</div>
        </div>
      </div>

      {/* Daily activity chart */}
      {data.dailyTrend.length > 1 && (
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Daily Activity</h3>
          <div className="flex items-end gap-[2px] h-24">
            {data.dailyTrend.slice(-30).map((d, i) => {
              const pct = (d.count / maxDaily) * 100;
              return (
                <div key={i} className="flex-1 group relative">
                  <div
                    className="bg-teal/60 hover:bg-teal rounded-t transition-colors w-full"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-bg2 border border-white/[0.12] rounded-lg px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mb-1 z-10">
                    {d.date}: {d.count} events
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-2">
            <span>{data.dailyTrend.slice(-30)[0]?.date}</span>
            <span>{data.dailyTrend[data.dailyTrend.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Feature ranking */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Feature Ranking (by events)</h3>
        <div className="space-y-3">
          {data.features.map((f, i) => {
            const pct = (f.totalEvents / maxEvents) * 100;
            return (
              <div key={f.feature} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-[family-name:var(--font-playfair)] text-sm w-5 text-center">{i + 1}</span>
                    <span className="text-sm font-medium">{f.feature.replace(/_/g, ' ')}</span>
                    {f.gateHits > 0 && (
                      <span className="text-[9px] text-stamp-red bg-stamp-red/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {f.gateHits} gate hits
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-text-muted">
                    <span>{f.uniqueUsers} users</span>
                    <span className="text-text font-medium">{f.totalEvents} events</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-gold/70 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                {/* Action breakdown */}
                <div className="flex gap-2 pl-7">
                  {Object.entries(f.actions).map(([action, count]) => (
                    <span key={action} className="text-[10px] text-text-muted">
                      {action}: {count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {data.features.length === 0 && (
            <div className="text-text-muted text-sm text-center py-6">
              No usage data yet — events will appear as users interact with features
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tiers Tab ──
function TiersTab({ data }: { data: TierData | null }) {
  if (!data) return <div className="text-text-muted text-sm animate-pulse">Loading tier data...</div>;

  const tiers = [
    { key: 'free', label: 'Free', color: 'text-muted', bgColor: 'bg-white/[0.06]', icon: '🆓' },
    { key: 'premium', label: 'Premium', color: 'gold', bgColor: 'bg-gold/10', icon: '✨' },
    { key: 'lifetime', label: 'Lifetime', color: 'teal', bgColor: 'bg-teal/10', icon: '💎' },
  ];

  return (
    <div className="space-y-6">
      {/* Tier breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiers.map(t => {
          const count = data.breakdown[t.key] || 0;
          const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
          return (
            <div key={t.key} className={`bg-bg3 border border-white/[0.08] rounded-2xl p-5 text-center`}>
              <div className="text-3xl mb-2">{t.icon}</div>
              <div className="font-[family-name:var(--font-playfair)] text-3xl mb-1" style={{ color: `var(--color-${t.color})` }}>
                {count}
              </div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider">{t.label}</div>
              <div className="text-[11px] text-text-muted mt-1">{pct}%</div>
            </div>
          );
        })}
      </div>

      {/* Visual bar */}
      <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">Distribution</h3>
        <div className="h-6 rounded-full overflow-hidden flex bg-white/[0.06]">
          {tiers.map(t => {
            const count = data.breakdown[t.key] || 0;
            const pct = data.total > 0 ? (count / data.total) * 100 : 0;
            if (pct === 0) return null;
            const colors: Record<string, string> = { free: '#8899a6', premium: '#c9a96e', lifetime: '#5bbfb5' };
            return (
              <div
                key={t.key}
                className="h-full transition-all duration-500 flex items-center justify-center text-[10px] font-medium"
                style={{ width: `${pct}%`, backgroundColor: colors[t.key] || '#555', color: '#0f1419' }}
              >
                {pct > 8 ? `${t.label} ${count}` : ''}
              </div>
            );
          })}
        </div>
        <div className="text-center text-xs text-text-muted mt-3">
          {data.total} total users
        </div>
      </div>

      {/* Monetization readiness */}
      <div className="bg-bg3 border border-gold/20 rounded-2xl p-5">
        <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">Monetization Status</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-stamp-green">✓</span>
            <span>Feature flags infrastructure ready</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-stamp-green">✓</span>
            <span>Usage tracking active</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-stamp-green">✓</span>
            <span>User tier system in place</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-gold">○</span>
            <span className="text-text-muted">Stripe integration (not connected)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-gold">○</span>
            <span className="text-text-muted">Premium features gated (all currently free)</span>
          </div>
        </div>
        <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
          To gate a feature, change its tier from &apos;free&apos; to &apos;premium&apos; in{' '}
          <code className="bg-bg4 px-1.5 py-0.5 rounded text-[10px]">src/lib/features.ts</code>.
          The FeatureGate component will automatically show an upgrade prompt.
        </p>
      </div>
    </div>
  );
}

// ── Helper ──
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bg4 rounded-xl px-3 py-2">
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

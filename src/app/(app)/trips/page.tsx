'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { TripCard } from '@/components/trips/trip-card';
import { TripModal } from '@/components/trips/trip-modal';
import { RouteMapOverlay } from '@/components/map/route-map-overlay';
import type { Trip } from '@/types';

type SortKey = 'newest' | 'oldest' | 'name' | 'duration';
type FilterKey = 'all' | 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Oceania';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name A-Z' },
  { key: 'duration', label: 'Longest first' },
];

const FILTER_OPTIONS: FilterKey[] = ['all', 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania'];

export default function TripsPage() {
  const { trips, loading, mapboxToken } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [routeTrip, setRouteTrip] = useState<Trip | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  const displayTrips = useMemo(() => {
    let list = trips.filter(t => !t.quickPin);
    if (filter !== 'all') list = list.filter(t => t.continent === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.cities?.toLowerCase().includes(q));
    }
    switch (sort) {
      case 'newest': list.sort((a, b) => (b.start || '').localeCompare(a.start || '')); break;
      case 'oldest': list.sort((a, b) => (a.start || '').localeCompare(b.start || '')); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'duration': list.sort((a, b) => b.days - a.days); break;
    }
    return list;
  }, [trips, sort, filter, search]);

  const totalReal = trips.filter(t => !t.quickPin).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-3 w-24 bg-bg3 rounded animate-pulse mb-2" />
            <div className="h-9 w-40 bg-bg3 rounded animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-bg3 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-bg3 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="h-40 bg-bg4 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-bg4 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-bg4 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function openEdit(trip: Trip) { setEditTrip(trip); setModalOpen(true); }
  function openNew() { setEditTrip(null); setModalOpen(true); }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-xs text-text-muted uppercase tracking-[2px] mb-1">Adventures logged</div>
          <h1 className="text-[32px]">My Trips</h1>
        </div>
        <button onClick={openNew} className="bg-gold text-bg px-5 py-2.5 rounded-[20px] font-medium text-sm cursor-pointer hover:opacity-85 hover:-translate-y-px transition-all">
          + Add Trip
        </button>
      </div>

      {totalReal === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <div className="text-5xl mb-4">🗺️</div>
          <div className="font-[family-name:var(--font-playfair)] text-[22px] text-text mb-2">No trips yet</div>
          <div className="text-sm mb-5">Start logging your adventures — dates, photos, routes & journal entries</div>
          <button onClick={openNew} className="bg-gold text-bg px-5 py-2.5 rounded-[20px] font-medium text-sm cursor-pointer">
            + Add your first trip
          </button>
        </div>
      ) : (
        <>
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search trips..."
              className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-text outline-none focus:border-gold transition-colors w-48 placeholder:text-text-muted"
            />
            <div className="flex gap-1">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] cursor-pointer border transition-all ${
                    filter === f
                      ? 'bg-gold/12 border-gold/40 text-gold'
                      : 'border-white/[0.08] text-text-muted hover:text-text hover:border-white/20'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="ml-auto bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-text-muted outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {displayTrips.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm">No trips match your filters</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayTrips.map(t => (
                <TripCard key={t.id} trip={t} onEdit={() => openEdit(t)} onRoute={() => {
                  if (!mapboxToken) { alert('Set your Mapbox token in Settings first.'); return; }
                  setRouteTrip(t);
                }} />
              ))}
            </div>
          )}
        </>
      )}

      <TripModal open={modalOpen} onOpenChange={setModalOpen} trip={editTrip} />
      {routeTrip && <RouteMapOverlay trip={routeTrip} open={!!routeTrip} onClose={() => setRouteTrip(null)} />}
    </div>
  );
}

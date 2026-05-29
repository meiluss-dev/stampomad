'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { getCountryCenter, haversine, fmtDate, numToAlpha } from '@/lib/countries';
import type { Trip, RouteWaypoint, TransportMode } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const topojson: { feature: (topology: any, object: any) => any };

let mapboxgl: any = null;

const TRANSPORT_MODES: { id: TransportMode; label: string; emoji: string; color: string; dash?: number[] }[] = [
  { id: 'plane', label: 'Plane', emoji: '✈️', color: '#60a5fa', dash: [8, 6] },
  { id: 'train', label: 'Train', emoji: '🚂', color: '#a855f7' },
  { id: 'bus', label: 'Bus', emoji: '🚌', color: '#22c55e' },
  { id: 'sleeping-bus', label: 'Sleeping Bus', emoji: '🛏️', color: '#2dd4bf' },
  { id: 'boat', label: 'Boat', emoji: '⛵', color: '#38bdf8' },
  { id: 'cycling', label: 'Cycling', emoji: '🚲', color: '#3b82f6' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾', color: '#ef4444' },
  { id: 'motorbike', label: 'Motorbike', emoji: '🏍️', color: '#e879f9' },
  { id: 'hitchhiking', label: 'Hitchhiking', emoji: '👍', color: '#f59e0b' },
  { id: 'car', label: 'Car', emoji: '🚗', color: '#fb923c' },
  { id: 'walking', label: 'Walking', emoji: '🚶', color: '#92400e', dash: [4, 4] },
];

function getTransportStyle(mode?: TransportMode) {
  return TRANSPORT_MODES.find(t => t.id === mode) || TRANSPORT_MODES[0];
}

const ROAD_PROFILES: Partial<Record<TransportMode, string>> = {
  car: 'driving',
  bus: 'driving',
  'sleeping-bus': 'driving',
  motorbike: 'driving',
  hitchhiking: 'driving',
  cycling: 'cycling',
  walking: 'walking',
  hiking: 'walking',
};

const routeGeomCache: Record<string, [number, number][]> = {};

async function fetchRouteGeometry(
  from: [number, number], to: [number, number], mode: TransportMode | undefined, token: string
): Promise<[number, number][]> {
  const profile = mode ? ROAD_PROFILES[mode] : undefined;
  if (!profile) return [from, to];

  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}-${to[0].toFixed(4)},${to[1].toFixed(4)}-${profile}`;
  if (routeGeomCache[key]) return routeGeomCache[key];

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      const coords = data.routes[0].geometry.coordinates as [number, number][];
      routeGeomCache[key] = coords;
      return coords;
    }
  } catch {}
  return [from, to];
}

const MAP_STYLES: Record<string, string> = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
};

interface WaypointState extends RouteWaypoint {
  marker: any;
}

interface ElevationData {
  elevations: number[];
  gain: number;
  loss: number;
  min: number;
  max: number;
}

let worldTopoCache: unknown = null;

function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo'; id: string } | null {
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (m) return { type: 'youtube', id: m[1] };
  m = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (m) return { type: 'vimeo', id: m[1] };
  return null;
}

function getVideoEmbed(url: string): string | null {
  const v = parseVideoUrl(url);
  if (!v) return null;
  if (v.type === 'youtube') return `https://www.youtube.com/embed/${v.id}`;
  return `https://player.vimeo.com/video/${v.id}`;
}

function getVideoThumb(url: string): string | null {
  const v = parseVideoUrl(url);
  if (!v) return null;
  if (v.type === 'youtube') return `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
  return null;
}

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 800;
        let cw = img.width, ch = img.height;
        if (cw > max || ch > max) {
          if (cw > ch) { ch = Math.round(ch * max / cw); cw = max; }
          else { cw = Math.round(cw * max / ch); ch = max; }
        }
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d')!.drawImage(img, 0, 0, cw, ch);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function SidebarWaypointEditor({ w, isHighlight, wpIdx, onUpdate, onDelete }: {
  w: RouteWaypoint;
  isHighlight: boolean;
  wpIdx: number;
  onUpdate: (updates: { name?: string; note?: string; transport?: TransportMode; images?: string[]; videos?: string[] }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = React.useState(w.name || '');
  const [note, setNote] = React.useState(w.note || '');
  const [videoUrl, setVideoUrl] = React.useState('');
  const [videoError, setVideoError] = React.useState('');
  const [playingVideo, setPlayingVideo] = React.useState<string | null>(null);
  const allImages = w.images?.length ? w.images : (w.imageData ? [w.imageData] : []);
  const allVideos = w.videos || [];
  const fileRef = React.useRef<HTMLInputElement>(null);

  function addVideo() {
    const trimmed = videoUrl.trim();
    if (!trimmed) return;
    if (!parseVideoUrl(trimmed)) {
      setVideoError('Paste a YouTube or Vimeo link');
      return;
    }
    if (allVideos.includes(trimmed)) {
      setVideoError('Already added');
      return;
    }
    onUpdate({ videos: [...allVideos, trimmed] });
    setVideoUrl('');
    setVideoError('');
  }

  return (
    <div className="px-3 pb-3 border-t border-white/[0.06] mt-0 pt-2 space-y-2">
      {/* Name */}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => onUpdate({ name })}
        placeholder={isHighlight ? 'Highlight name' : 'Waypoint name'}
        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[13px] text-text outline-none focus:border-gold/40"
      />

      {/* Note */}
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={() => onUpdate({ note })}
        placeholder="Add a note…"
        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[12px] text-text outline-none resize-y min-h-[36px] max-h-[120px] focus:border-gold/40"
      />

      {/* Transport selector */}
      {!isHighlight && wpIdx > 1 && (
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Traveled by</div>
          <div className="flex flex-wrap gap-1">
            {TRANSPORT_MODES.map(t => (
              <button
                key={t.id}
                onClick={() => onUpdate({ transport: t.id })}
                className="px-2 py-0.5 rounded-md text-[11px] cursor-pointer border transition-all"
                style={{
                  borderColor: w.transport === t.id ? t.color : 'var(--sm-border)',
                  background: w.transport === t.id ? t.color + '22' : 'transparent',
                  color: w.transport === t.id ? t.color : 'var(--sm-text-muted)',
                }}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Photos {allImages.length > 0 && `(${allImages.length})`}</div>
          <label className="text-[11px] text-teal cursor-pointer hover:underline">
            + Add
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length) return;
                const newImgs = [...allImages];
                for (const file of Array.from(files)) {
                  newImgs.push(await resizeImageFile(file));
                }
                onUpdate({ images: newImgs });
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
          </label>
        </div>
        {allImages.length > 0 ? (
          <div className="flex gap-1.5 flex-wrap">
            {allImages.map((src, i) => (
              <div key={i} className="relative w-[56px] h-[56px] rounded-lg overflow-hidden border border-white/[0.08] group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    const next = allImages.filter((_, j) => j !== i);
                    onUpdate({ images: next });
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] leading-4 text-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >x</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-text-muted italic">No photos</div>
        )}
      </div>

      {/* Videos */}
      <div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Videos {allVideos.length > 0 && `(${allVideos.length})`}</div>
        {allVideos.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {allVideos.map((url, i) => {
              const thumb = getVideoThumb(url);
              const embed = getVideoEmbed(url);
              const parsed = parseVideoUrl(url);
              const isPlaying = playingVideo === url;
              return (
                <div key={i} className="relative rounded-lg overflow-hidden border border-white/[0.08] group">
                  {isPlaying && embed ? (
                    <iframe
                      src={embed + '?autoplay=1'}
                      className="w-full aspect-video"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <div
                      className="relative w-full aspect-video bg-bg cursor-pointer"
                      onClick={() => setPlayingVideo(url)}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/[0.04]">
                          <span className="text-text-muted text-[11px]">{parsed?.type === 'vimeo' ? 'Vimeo' : 'Video'}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-white text-lg ml-0.5">&#9654;</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onUpdate({ videos: allVideos.filter((_, j) => j !== i) });
                      if (isPlaying) setPlayingVideo(null);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[11px] leading-5 text-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >x</button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-1">
          <input
            value={videoUrl}
            onChange={e => { setVideoUrl(e.target.value); setVideoError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideo(); } }}
            placeholder="Paste YouTube or Vimeo link"
            className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[12px] text-text outline-none focus:border-gold/40 min-w-0"
          />
          <button
            onClick={addVideo}
            className="px-2.5 py-1.5 rounded-lg bg-teal/15 text-teal text-[12px] border border-teal/30 cursor-pointer hover:bg-teal/25 transition-colors shrink-0"
          >+ Add</button>
        </div>
        {videoError && <div className="text-[11px] text-stamp-red mt-0.5">{videoError}</div>}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full py-1.5 rounded-lg text-[12px] text-stamp-red border border-stamp-red/20 hover:bg-stamp-red/10 cursor-pointer transition-colors"
      >
        Delete waypoint
      </button>
    </div>
  );
}

export function RouteMapOverlay({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { mapboxToken, routes, saveRoute } = useStore();
  const mapRef = useRef<any>(null);
  const waypointsRef = useRef<WaypointState[]>([]);
  const distanceMarkersRef = useRef<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elevTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elevCacheRef = useRef<Record<string, number>>({});
  const historyRef = useRef<RouteWaypoint[][]>([]);
  const historyIdxRef = useRef(-1);
  const restoringRef = useRef(false);

  const [tool, setToolState] = useState<'move' | 'waypoint' | 'highlight'>('waypoint');
  const [style, setStyleState] = useState('satellite');
  const [sidebarTab, setSidebarTab] = useState<'route' | 'stats' | 'notes'>('route');
  const [waypointList, setWaypointList] = useState<RouteWaypoint[]>([]);
  const [stats, setStats] = useState({ distance: '0 km', waypoints: 0, highlights: 0 });
  const [elevation, setElevation] = useState<ElevationData | null>(null);
  const [elevStatus, setElevStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [expandedWp, setExpandedWp] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const segmentLayersRef = useRef<string[]>([]);

  const updateRouteLine = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    segmentLayersRef.current.forEach(id => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
      try { if (map.getLayer(id + '-glow')) map.removeLayer(id + '-glow'); } catch {}
      try { if (map.getSource(id)) map.removeSource(id); } catch {}
    });
    segmentLayersRef.current = [];

    const wps = waypointsRef.current.filter(w => w.type === 'waypoint');
    const segmentCoords = await Promise.all(
      wps.slice(1).map((curr, i) => {
        const prev = wps[i];
        const from: [number, number] = [prev.lng, prev.lat];
        const to: [number, number] = [curr.lng, curr.lat];
        if (curr.transport && ROAD_PROFILES[curr.transport] && mapboxToken) {
          return fetchRouteGeometry(from, to, curr.transport, mapboxToken);
        }
        return Promise.resolve([from, to] as [number, number][]);
      })
    );

    for (let i = 0; i < segmentCoords.length; i++) {
      const curr = wps[i + 1];
      const style = getTransportStyle(curr.transport);
      const srcId = `segment-${i + 1}`;
      segmentLayersRef.current.push(srcId);

      map.addSource(srcId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: segmentCoords[i] }, properties: {} },
      });
      map.addLayer({
        id: srcId + '-glow', type: 'line', source: srcId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': style.color, 'line-width': 8, 'line-opacity': 0.15 },
      });
      map.addLayer({
        id: srcId, type: 'line', source: srcId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': style.color,
          'line-width': 3,
          'line-opacity': 0.85,
          ...(style.dash ? { 'line-dasharray': style.dash as any } : {}),
        },
      });
    }
  }, [mapboxToken]);

  const updateDistanceLabels = useCallback(() => {
    const map = mapRef.current;
    distanceMarkersRef.current.forEach(m => m.remove());
    distanceMarkersRef.current = [];
    if (!map) return;
    const wps = waypointsRef.current.filter(w => w.type === 'waypoint');
    if (wps.length < 2) return;
    for (let i = 1; i < wps.length; i++) {
      const prev = wps[i - 1], curr = wps[i];
      const dist = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
      const label = dist < 1 ? Math.round(dist * 1000) + 'm' : Math.round(dist) + 'km';
      const el = document.createElement('div');
      el.style.cssText = "background:color-mix(in srgb, var(--sm-bg) 85%, transparent);color:var(--sm-teal);font-size:11px;font-family:'DM Sans',sans-serif;padding:3px 7px;border-radius:10px;border:1px solid color-mix(in srgb, var(--sm-teal) 30%, transparent);white-space:nowrap;pointer-events:none;backdrop-filter:blur(4px)";
      el.textContent = label;
      distanceMarkersRef.current.push(
        new (mapboxgl as any).Marker({ element: el, anchor: 'center' })
          .setLngLat([(prev.lng + curr.lng) / 2, (prev.lat + curr.lat) / 2])
          .addTo(map)
      );
    }
  }, []);

  const updateStats = useCallback(() => {
    const wps = waypointsRef.current.filter(w => w.type === 'waypoint');
    const hls = waypointsRef.current.filter(w => w.type === 'highlight');
    let dist = 0;
    for (let i = 1; i < wps.length; i++) dist += haversine(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng);
    setStats({
      distance: dist > 0 ? (dist < 1 ? Math.round(dist * 1000) + 'm' : Math.round(dist) + 'km') : '0 km',
      waypoints: wps.length,
      highlights: hls.length,
    });
  }, []);

  const syncWaypointList = useCallback(() => {
    setWaypointList(waypointsRef.current.map(w => ({ id: w.id, lng: w.lng, lat: w.lat, type: w.type, name: w.name, note: w.note, transport: w.transport, imageData: w.imageData, images: w.images, videos: w.videos })));
  }, []);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(() => {
    if (restoringRef.current) return;
    const snapshot: RouteWaypoint[] = waypointsRef.current.map(w => ({
      id: w.id, lng: w.lng, lat: w.lat, type: w.type, name: w.name,
      note: w.note, transport: w.transport, imageData: w.imageData, images: w.images ? [...w.images] : [], videos: w.videos ? [...w.videos] : [],
    }));
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIdxRef.current++;
    }
    updateHistoryState();
  }, [updateHistoryState]);

  const notesRef = useRef(notes);
  notesRef.current = notes;

  const saveCurrentRoute = useCallback(async (explicit = false) => {
    const data = {
      waypoints: waypointsRef.current.map(w => ({ id: w.id, lng: w.lng, lat: w.lat, type: w.type, name: w.name, note: w.note, transport: w.transport, imageData: w.imageData, images: w.images, videos: w.videos })),
      notes: notesRef.current,
    };
    if (explicit) {
      setSaveStatus('saving');
      try {
        await saveRoute(trip.id, data);
        setSaveStatus('saved');
        setHasUnsaved(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } else {
      setHasUnsaved(true);
      saveRoute(trip.id, data);
    }
  }, [trip.id, saveRoute]);

  const scheduleElevationFetch = useCallback(() => {
    if (elevTimerRef.current) clearTimeout(elevTimerRef.current);
    elevTimerRef.current = setTimeout(() => fetchElevations(), 800);
  }, []);

  async function getElevationFromTile(lng: number, lat: number): Promise<number> {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (elevCacheRef.current[key] !== undefined) return elevCacheRef.current[key];
    try {
      const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?layers=contour&limit=50&access_token=${mapboxToken}`;
      const res = await fetch(url);
      const data = await res.json();
      let elev = 0;
      if (data.features?.length > 0) {
        const ef = data.features.filter((f: { properties?: { ele?: number } }) => f.properties?.ele != null);
        if (ef.length > 0) elev = Math.max(...ef.map((f: { properties: { ele: number } }) => Number(f.properties.ele)));
      }
      elevCacheRef.current[key] = elev;
      return elev;
    } catch {
      return 0;
    }
  }

  async function fetchElevations() {
    const wps = waypointsRef.current.filter(w => w.type === 'waypoint');
    if (wps.length < 2) {
      setElevation(null);
      setElevStatus('');
      return;
    }
    setElevStatus('Loading…');
    try {
      const elevations = await Promise.all(wps.map(w => getElevationFromTile(w.lng, w.lat)));
      const min = Math.min(...elevations);
      const max = Math.max(...elevations);
      let gain = 0, loss = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) gain += diff; else loss += Math.abs(diff);
      }
      setElevation({ elevations, gain, loss, min, max });
      setElevStatus('');
    } catch {
      setElevStatus('Unavailable');
    }
  }

  const addWaypoint = useCallback((lng: number, lat: number, type: 'waypoint' | 'highlight' = 'waypoint', name = '', id?: string, imageData?: string | null, images?: string[], note?: string, transport?: TransportMode, videos?: string[]) => {
    const map = mapRef.current;
    if (!map) return;
    const wId = id || Date.now() + '-' + Math.floor(Math.random() * 100000);
    const isHighlight = type === 'highlight';
    const thumbSrc = images?.length ? images[0] : imageData;

    const el = document.createElement('div');
    el.style.cssText = 'cursor:pointer;transition:transform .15s;display:flex;align-items:center;justify-content:center;';

    if (isHighlight) {
      el.style.width = '28px'; el.style.height = '28px';
      el.innerHTML = '<span style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))">⭐</span>';
    } else if (thumbSrc) {
      el.style.width = '36px'; el.style.height = '36px';
      el.innerHTML = `<div style="width:34px;height:34px;border-radius:50%;border:2px solid var(--sm-gold);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5)"><img src="${thumbSrc}" style="width:100%;height:100%;object-fit:cover"></div>`;
    } else {
      el.style.width = '16px'; el.style.height = '16px';
      el.innerHTML = '<div style="width:14px;height:14px;border-radius:50%;background:var(--sm-gold);border:2px solid var(--sm-text);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>';
    }

    el.addEventListener('mouseenter', () => { const inner = el.firstElementChild as HTMLElement; if (inner) inner.style.transform = 'scale(1.35)'; });
    el.addEventListener('mouseleave', () => { const inner = el.firstElementChild as HTMLElement; if (inner) inner.style.transform = 'scale(1)'; });

    const marker = new (mapboxgl as any).Marker({ element: el, anchor: 'center', draggable: true }).setLngLat([lng, lat]).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      const w = waypointsRef.current.find(w => w.id === wId);
      if (w) { w.lng = pos.lng; w.lat = pos.lat; }
      updateRouteLine();
      updateDistanceLabels();
      syncWaypointList();
      updateStats();
      pushHistory();
      saveCurrentRoute();
    });

    function updateMarkerIcon(w: WaypointState) {
      const src = w.images?.length ? w.images[0] : w.imageData;
      if (src) {
        el.style.width = '36px'; el.style.height = '36px';
        el.innerHTML = `<div style="width:34px;height:34px;border-radius:50%;border:2px solid var(--sm-gold);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5)"><img src="${src}" style="width:100%;height:100%;object-fit:cover"></div>`;
      } else {
        el.style.width = '16px'; el.style.height = '16px';
        el.innerHTML = '<div style="width:14px;height:14px;border-radius:50%;background:var(--sm-gold);border:2px solid var(--sm-text);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>';
      }
    }

    function resizeImage(file: File): Promise<string> {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const max = 800;
            let cw = img.width, ch = img.height;
            if (cw > max || ch > max) {
              if (cw > ch) { ch = Math.round(ch * max / cw); cw = max; }
              else { cw = Math.round(cw * max / ch); ch = max; }
            }
            canvas.width = cw; canvas.height = ch;
            canvas.getContext('2d')!.drawImage(img, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    }

    const isMobile = window.innerWidth < 768;
    const popup = new (mapboxgl as any).Popup({ offset: 18, closeButton: true, maxWidth: isMobile ? '260px' : '280px' });
    marker.setPopup(popup);

    function buildPopupHTML(w: WaypointState) {
      const allImages = w.images?.length ? w.images : (w.imageData ? [w.imageData] : []);
      const gallery = allImages.length > 0
        ? `<div id="wp-gallery-${wId}" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${allImages.map((src, i) =>
            `<div style="position:relative;width:54px;height:54px;border-radius:6px;overflow:hidden;border:1px solid var(--sm-border)"><img src="${src}" style="width:100%;height:100%;object-fit:cover"><button class="wp-img-rm" data-idx="${i}" style="position:absolute;top:1px;right:1px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:50%;width:16px;height:16px;cursor:pointer;font-size:10px;line-height:16px;text-align:center">×</button></div>`
          ).join('')}</div>`
        : '';
      const noteVal = (w.note || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
      const wpIdx = waypointsRef.current.filter(x => x.type === 'waypoint').findIndex(x => x.id === w.id);
      const showTransport = w.type === 'waypoint' && wpIdx > 0;
      const transportSelect = showTransport
        ? `<div style="margin-bottom:6px">
            <div style="font-size:11px;color:var(--sm-text-muted);margin-bottom:3px">Traveled by:</div>
            <div id="wp-transport-${wId}" style="display:flex;flex-wrap:wrap;gap:3px">${TRANSPORT_MODES.map(t =>
              `<button data-mode="${t.id}" style="padding:3px 8px;border-radius:5px;border:1px solid ${w.transport === t.id ? t.color : 'var(--sm-border)'};background:${w.transport === t.id ? t.color + '22' : 'transparent'};color:${w.transport === t.id ? t.color : 'var(--sm-text-muted)'};cursor:pointer;font-size:11px;white-space:nowrap">${t.emoji} ${t.label}</button>`
            ).join('')}</div>
          </div>`
        : '';
      return `<div style="font-family:'DM Sans',sans-serif;min-width:220px;max-width:300px;padding:4px">
        <input id="wp-name-${wId}" value="${(w.name || '').replace(/"/g, '&quot;')}" placeholder="${isHighlight ? 'Highlight name' : 'Waypoint name'}" style="width:100%;border:1px solid var(--sm-border);border-radius:6px;padding:6px 8px;font-size:13px;margin-bottom:6px;box-sizing:border-box;color:var(--sm-text);background:color-mix(in srgb, var(--sm-bg3) 60%, transparent)">
        ${transportSelect}
        <textarea id="wp-note-${wId}" placeholder="Add a note…" style="width:100%;border:1px solid var(--sm-border);border-radius:6px;padding:6px 8px;font-size:12px;margin-bottom:6px;box-sizing:border-box;resize:vertical;min-height:40px;max-height:120px;font-family:inherit;color:var(--sm-text);background:color-mix(in srgb, var(--sm-bg3) 60%, transparent)">${noteVal}</textarea>
        ${gallery}
        <div style="display:flex;gap:6px">
          <button id="wp-save-${wId}" style="flex:1;background:var(--sm-gold);color:var(--sm-bg);border:none;border-radius:6px;padding:7px;cursor:pointer;font-size:12px;font-weight:500">${allImages.length > 0 ? `✓ Save (${allImages.length})` : '✓ Save'}</button>
          <label style="background:#e0f2fe;color:#0284c7;border:1px solid #7dd3fc;border-radius:6px;padding:7px 10px;cursor:pointer;font-size:12px;text-align:center">📷<input id="wp-file-${wId}" type="file" accept="image/*" multiple style="display:none"></label>
          <button id="wp-del-${wId}" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:7px 10px;cursor:pointer;font-size:12px">🗑️</button>
        </div></div>`;
    }

    function bindPopupEvents(w: WaypointState) {
      document.getElementById(`wp-transport-${wId}`)?.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          w.transport = btn.dataset.mode as TransportMode;
          updateRouteLine();
          popup.setHTML(buildPopupHTML(w));
          bindPopupEvents(w);
          syncWaypointList();
        });
      });
      document.getElementById(`wp-save-${wId}`)?.addEventListener('click', () => {
        const input = document.getElementById(`wp-name-${wId}`) as HTMLInputElement;
        const noteInput = document.getElementById(`wp-note-${wId}`) as HTMLTextAreaElement;
        if (input) { w.name = input.value; }
        if (noteInput) { w.note = noteInput.value; }
        marker.togglePopup();
        syncWaypointList();
        pushHistory();
        saveCurrentRoute();
      });
      document.getElementById(`wp-file-${wId}`)?.addEventListener('change', async (ev) => {
        const files = (ev.target as HTMLInputElement).files;
        if (!files?.length) return;
        if (!w.images) w.images = w.imageData ? [w.imageData] : [];
        for (const file of Array.from(files)) {
          const data = await resizeImage(file);
          w.images.push(data);
        }
        w.imageData = w.images[0];
        updateMarkerIcon(w);
        popup.setHTML(buildPopupHTML(w));
        bindPopupEvents(w);
        syncWaypointList();
        saveCurrentRoute();
      });
      document.getElementById(`wp-gallery-${wId}`)?.querySelectorAll('.wp-img-rm').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const idx = parseInt((ev.currentTarget as HTMLElement).dataset.idx || '0');
          if (!w.images) return;
          w.images.splice(idx, 1);
          w.imageData = w.images[0] || null;
          updateMarkerIcon(w);
          popup.setHTML(buildPopupHTML(w));
          bindPopupEvents(w);
          syncWaypointList();
          saveCurrentRoute();
        });
      });
      document.getElementById(`wp-del-${wId}`)?.addEventListener('click', () => {
        removeWaypoint(wId);
      });
    }

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      const w = waypointsRef.current.find(w => w.id === wId);
      if (!w) return;

      // On mobile: expand the sidebar editor instead of map popup
      if (window.innerWidth < 768) {
        setExpandedWp(prev => prev === wId ? null : wId);
        setSidebarTab('route');
        // Scroll sidebar to the expanded waypoint after a tick
        setTimeout(() => {
          const el = document.getElementById(`sidebar-wp-${wId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }

      // Desktop: use map popup
      popup.setHTML(buildPopupHTML(w));
      popup.once('open', () => bindPopupEvents(w));
      marker.togglePopup();
    });
    el.addEventListener('dblclick', (e) => { e.stopPropagation(); if (clickTimerRef.current) clearTimeout(clickTimerRef.current); });

    waypointsRef.current.push({ id: wId, lng, lat, type, name, note: note || '', transport, imageData: imageData || null, images: images || [], videos: videos || [], marker });
    updateRouteLine();
    updateDistanceLabels();
    syncWaypointList();
    updateStats();
    scheduleElevationFetch();
    pushHistory();
    saveCurrentRoute();
  }, [updateRouteLine, updateDistanceLabels, syncWaypointList, updateStats, saveCurrentRoute, scheduleElevationFetch, pushHistory]);

  const removeWaypoint = useCallback((id: string) => {
    const idx = waypointsRef.current.findIndex(w => w.id === id);
    if (idx < 0) return;
    waypointsRef.current[idx].marker.remove();
    waypointsRef.current.splice(idx, 1);
    updateRouteLine();
    updateDistanceLabels();
    syncWaypointList();
    updateStats();
    scheduleElevationFetch();
    pushHistory();
    saveCurrentRoute();
  }, [updateRouteLine, updateDistanceLabels, syncWaypointList, updateStats, scheduleElevationFetch, saveCurrentRoute, pushHistory]);

  const restoreSnapshot = useCallback((snapshot: RouteWaypoint[]) => {
    restoringRef.current = true;
    waypointsRef.current.forEach(w => w.marker.remove());
    distanceMarkersRef.current.forEach(m => m.remove());
    distanceMarkersRef.current = [];
    waypointsRef.current = [];
    snapshot.forEach(w => addWaypoint(w.lng, w.lat, w.type, w.name, w.id, w.imageData, w.images, w.note, w.transport, w.videos));
    restoringRef.current = false;
    updateHistoryState();
  }, [addWaypoint, updateHistoryState]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    restoreSnapshot(historyRef.current[historyIdxRef.current]);
    saveCurrentRoute();
  }, [restoreSnapshot, saveCurrentRoute]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    restoreSnapshot(historyRef.current[historyIdxRef.current]);
    saveCurrentRoute();
  }, [restoreSnapshot, saveCurrentRoute]);

  const clearAllWaypoints = useCallback(() => {
    if (!waypointsRef.current.length || !confirm('Clear all waypoints?')) return;
    waypointsRef.current.forEach(w => w.marker.remove());
    distanceMarkersRef.current.forEach(m => m.remove());
    waypointsRef.current = [];
    distanceMarkersRef.current = [];
    updateRouteLine();
    syncWaypointList();
    updateStats();
    pushHistory();
    saveCurrentRoute();
  }, [updateRouteLine, syncWaypointList, updateStats, saveCurrentRoute, pushHistory]);

  const flyToWaypoint = useCallback((id: string) => {
    const w = waypointsRef.current.find(w => w.id === id);
    const map = mapRef.current;
    if (!w || !map) return;
    map.flyTo({ center: [w.lng, w.lat], zoom: Math.max(map.getZoom(), 10), duration: 800 });
  }, []);

  const fitRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !waypointsRef.current.length) return;
    const bounds = new (mapboxgl as any).LngLatBounds();
    waypointsRef.current.forEach(w => bounds.extend([w.lng, w.lat]));
    map.fitBounds(bounds, { padding: 80, duration: 1000 });
  }, []);

  function highlightCountry(map: any, code: string) {
    if (!code) return;
    const clean = code.includes('|') ? code.split('|')[0] : code;

    const apply = (world: Record<string, unknown>) => {
      const numId = Object.entries(numToAlpha).find(([, v]) => v === clean.toUpperCase())?.[0];
      if (!numId) return;
      const objs = (world.objects as Record<string, { geometries: Array<{ id: string | number }> }>).countries;
      const matchGeom = objs.geometries.find(g => String(g.id) === String(numId));
      if (!matchGeom) return;
      const geojson = topojson.feature(world, matchGeom);
      if (!geojson) return;

      try {
        ['country-fill', 'country-glow', 'country-border'].forEach(id => { try { if (map.getLayer(id)) map.removeLayer(id); } catch {} });
        try { if (map.getSource('country-hl')) map.removeSource('country-hl'); } catch {}
      } catch {}

      map.addSource('country-hl', { type: 'geojson', data: geojson as GeoJSON.GeoJSON });
      const goldHex = getComputedStyle(document.documentElement).getPropertyValue('--sm-gold').trim() || '#c9a96e';
      const goldLightHex = getComputedStyle(document.documentElement).getPropertyValue('--sm-gold-light').trim() || '#f0d090';
      map.addLayer({ id: 'country-fill', type: 'fill', source: 'country-hl', paint: { 'fill-color': goldHex, 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'country-glow', type: 'line', source: 'country-hl', paint: { 'line-color': goldHex, 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 4 } });
      map.addLayer({ id: 'country-border', type: 'line', source: 'country-hl', paint: { 'line-color': goldLightHex, 'line-width': 2, 'line-opacity': 1, 'line-dasharray': [4, 3] } });
    };

    if (worldTopoCache) {
      apply(worldTopoCache as Record<string, unknown>);
    } else {
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
        .then(r => r.json())
        .then(world => { worldTopoCache = world; apply(world); })
        .catch(() => {});
    }
  }

  function changeMapStyle(newStyle: string) {
    setStyleState(newStyle);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(MAP_STYLES[newStyle]);
    map.once('style.load', () => {
      segmentLayersRef.current = [];
      updateRouteLine();
      if (trip.code) map.once('idle', () => highlightCountry(map, trip.code));
      waypointsRef.current.forEach(w => w.marker.addTo(map));
    });
  }

  // Initialize map when overlay opens
  useEffect(() => {
    console.log('[Map] Effect: open=', open, 'token=', mapboxToken?.substring(0, 10), 'container=', !!containerRef.current);
    if (!open || !mapboxToken || !containerRef.current) return;
    let cancelled = false;

    async function initMap() {
      try {
        console.log('[Map] Importing mapbox-gl...');
        if (!mapboxgl) {
          const mod = await import('mapbox-gl');
          mapboxgl = mod.default || mod;
        }
        console.log('[Map] mapboxgl loaded:', typeof mapboxgl, Object.keys(mapboxgl).slice(0, 5));

        if (cancelled || !containerRef.current) {
          console.log('[Map] Cancelled or no container after import');
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        console.log('[Map] Container rect:', rect.width, 'x', rect.height);

        // Clean up any existing map first
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

        const saved = routes[trip.id];
        setNotes(saved?.notes || trip.notes || '');
        setToolState('waypoint');
        setSidebarTab('route');

        const savedWp = saved?.waypoints || [];
        const center = savedWp.length > 0 ? [savedWp[0].lng, savedWp[0].lat] as [number, number] : getCountryCenter(trip.code);

        console.log('[Map] Creating map with center:', center, 'style:', MAP_STYLES[style]);
        (mapboxgl as any).accessToken = mapboxToken;
        const isMobile = window.innerWidth < 768;
        const map = new (mapboxgl as any).Map({
          container: containerRef.current,
          style: MAP_STYLES[style],
          center,
          zoom: savedWp.length > 0 ? 6 : 4,
          attributionControl: false, // We'll add compact attribution
          logoPosition: 'bottom-right',
        });
        // Add compact attribution (required by Mapbox ToS)
        map.addControl(new (mapboxgl as any).AttributionControl({ compact: true }), 'bottom-right');
        console.log('[Map] Map instance created');

        mapRef.current = map;

        map.on('error', (e: any) => console.error('[Map] ERROR:', e.error?.message || e));

        setTimeout(() => { console.log('[Map] resize at 100ms'); map.resize(); }, 100);
        setTimeout(() => { console.log('[Map] resize at 500ms'); map.resize(); }, 500);

      // Desktop: full controls. Mobile: clean map
      if (!isMobile) {
        map.addControl(new (mapboxgl as any).NavigationControl(), 'top-right');
        map.addControl(new (mapboxgl as any).ScaleControl(), 'bottom-right');
      }

      map.on('load', () => {
        console.log('[Map] MAP LOADED - tiles should be visible');
        map.resize();

        if (trip.code) map.once('idle', () => highlightCountry(map, trip.code));

        restoringRef.current = true;
        savedWp.forEach(w => addWaypoint(w.lng, w.lat, w.type, w.name, w.id, w.imageData, w.images, w.note, w.transport, w.videos));
        restoringRef.current = false;
        historyRef.current = [waypointsRef.current.map(w => ({
          id: w.id, lng: w.lng, lat: w.lat, type: w.type, name: w.name,
          note: w.note, transport: w.transport, imageData: w.imageData, images: w.images ? [...w.images] : [], videos: w.videos ? [...w.videos] : [],
        }))];
        historyIdxRef.current = 0;
        if (savedWp.length > 1) {
          const bounds = new (mapboxgl as any).LngLatBounds();
          savedWp.forEach(w => bounds.extend([w.lng, w.lat]));
          map.fitBounds(bounds, { padding: 80, duration: 1000 });
        }
      });

      // Shared function to show the add waypoint/highlight context menu
      function showAddMenu(lng: number, lat: number) {
        const hasWaypoints = waypointsRef.current.filter(w => w.type === 'waypoint').length > 0;
        const menuEl = document.createElement('div');
        menuEl.style.cssText = "font-family:'DM Sans',sans-serif;background:color-mix(in srgb, var(--sm-bg) 95%, transparent);border:1px solid var(--sm-border);border-radius:10px;padding:4px;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:160px;z-index:999;max-height:400px;overflow-y:auto";

        const btnStyle = "display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border:none;background:transparent;color:var(--sm-text);cursor:pointer;border-radius:6px;font-size:13px;text-align:left";
        const hdrStyle = "padding:4px 12px 2px;font-size:10px;color:var(--sm-text-muted);text-transform:uppercase;letter-spacing:1px";

        let html = `<button data-action="waypoint" style="${btnStyle}">📍 Add Waypoint</button>`;
        if (hasWaypoints) {
          html += `<div style="height:1px;background:var(--sm-border);margin:4px 0"></div>`;
          html += `<div style="${hdrStyle}">Traveled by</div>`;
          html += TRANSPORT_MODES.map(t =>
            `<button data-action="waypoint" data-transport="${t.id}" style="${btnStyle}"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${t.color};flex-shrink:0"></span>${t.emoji} ${t.label}</button>`
          ).join('');
        }
        html += `<div style="height:1px;background:var(--sm-border);margin:4px 0"></div>`;
        html += `<button data-action="highlight" style="${btnStyle}">⭐ Add Highlight</button>`;
        menuEl.innerHTML = html;

        const ctxMarker = new (mapboxgl as any).Popup({ closeButton: true, closeOnClick: true, anchor: 'top-left', offset: [0, 0] })
          .setLngLat([lng, lat])
          .setDOMContent(menuEl)
          .addTo(map);

        menuEl.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('mouseenter', () => { btn.style.background = 'color-mix(in srgb, var(--sm-text) 8%, transparent)'; });
          btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
          btn.addEventListener('click', () => {
            const action = btn.dataset.action as 'waypoint' | 'highlight';
            const transport = btn.dataset.transport as TransportMode | undefined;
            addWaypoint(lng, lat, action, '', undefined, undefined, undefined, undefined, transport);
            ctxMarker.remove();
          });
        });
      }

      // Desktop: right-click to add waypoints
      map.on('contextmenu', (e: any) => {
        e.preventDefault();
        showAddMenu(e.lngLat.lng, e.lngLat.lat);
      });

      // Mobile: long-press (tap and hold) to add waypoints
      let longPressTimer: ReturnType<typeof setTimeout> | null = null;
      let touchMoved = false;
      const mapCanvas = map.getCanvas();

      mapCanvas.addEventListener('touchstart', (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        touchMoved = false;
        longPressTimer = setTimeout(() => {
          if (touchMoved) return;
          // Prevent the map from panning after long-press
          e.preventDefault();
          // Get map coordinates from touch point
          const touch = e.touches[0];
          const rect = mapCanvas.getBoundingClientRect();
          const point = new (mapboxgl as any).Point(
            touch.clientX - rect.left,
            touch.clientY - rect.top
          );
          const lngLat = map.unproject(point);
          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(50);
          showAddMenu(lngLat.lng, lngLat.lat);
        }, 600);
      }, { passive: false });

      mapCanvas.addEventListener('touchmove', () => {
        touchMoved = true;
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      });

      mapCanvas.addEventListener('touchend', () => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      });

      mapCanvas.addEventListener('touchcancel', () => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      });

      map.on('mousemove', (e: any) => {
        const { lng, lat } = e.lngLat;
        setCoords(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
      });
      } catch (err) {
        console.error('[Map] initMap failed:', err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      distanceMarkersRef.current.forEach(m => m.remove());
      distanceMarkersRef.current = [];
      waypointsRef.current = [];
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [open, mapboxToken, trip.id]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, undo, redo]);

  // Cursor is always default — right-click to add waypoints
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = '';
  }, [tool]);

  async function handleClose() {
    await saveCurrentRoute(true);
    onClose();
  }

  function exportMap() {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    const link = document.createElement('a');
    link.download = (trip.name || 'route') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (!open) return null;

  const wps = waypointList.filter(w => w.type === 'waypoint');
  const cumDist: number[] = [0];
  for (let i = 1; i < wps.length; i++) cumDist.push(cumDist[i - 1] + haversine(wps[i - 1].lat, wps[i - 1].lng, wps[i].lat, wps[i].lng));

  let wpNum = 0;

  return (
    <div className="fixed inset-0 z-[300] bg-bg flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/[0.08] bg-bg/95 backdrop-blur-[10px] shrink-0">
        <button onClick={handleClose} className="text-text-muted hover:text-text text-xl cursor-pointer">←</button>
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-playfair)] text-base sm:text-xl truncate">{trip.emoji} {trip.name}</div>
          <div className="text-[10px] sm:text-xs text-text-muted mt-0.5">{trip.code}{trip.start ? ` · ${fmtDate(trip.start)} – ${fmtDate(trip.end)}` : ''}</div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide order-last sm:order-none w-full sm:w-auto">
          {Object.keys(MAP_STYLES).map(s => (
            <button key={s} onClick={() => changeMapStyle(s)} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition-all whitespace-nowrap ${style === s ? 'bg-gold/15 border-gold text-gold' : 'border-white/[0.08] text-text-muted hover:text-text'}`}>
              {s === 'satellite' ? '🛰️' : s === 'outdoors' ? '🏔️' : s === 'dark' ? '🌙' : '🗺️'} {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => saveCurrentRoute(true)}
          className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs cursor-pointer border font-medium transition-all whitespace-nowrap ${
            saveStatus === 'saved' ? 'bg-teal/15 border-teal text-teal' :
            saveStatus === 'saving' ? 'bg-gold/10 border-gold/50 text-gold/70' :
            saveStatus === 'error' ? 'bg-stamp-red/15 border-stamp-red text-stamp-red' :
            hasUnsaved ? 'bg-gold/15 border-gold text-gold' :
            'border-white/[0.08] text-text-muted hover:text-text'
          }`}
        >
          {saveStatus === 'saving' ? '⏳ Saving…' :
           saveStatus === 'saved' ? '✓ Saved' :
           saveStatus === 'error' ? '✗ Error' :
           hasUnsaved ? '💾 Save Route' : '💾 Save'}
        </button>
        <button onClick={exportMap} className="hidden sm:block px-3 py-1.5 rounded-lg text-xs border border-white/[0.08] text-text-muted hover:text-text cursor-pointer">📷 Export</button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_320px] overflow-hidden min-h-0">
        {/* Map */}
        <div className="relative min-h-[40vh] md:min-h-0 flex-1 md:flex-none">
          <div ref={containerRef} className="absolute inset-0" />
          {!mapboxToken && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg z-10">
              <div className="text-center max-w-sm">
                <div className="text-4xl mb-3">🗺️</div>
                <div className="text-lg font-medium text-text mb-2">Map loading...</div>
                <div className="text-sm text-text-muted">If the map doesn&apos;t appear, please reload the page or contact support.</div>
              </div>
            </div>
          )}
          {/* Tool buttons — hidden on mobile for clean map */}
          <div className="hidden md:flex absolute left-3 top-3 flex-col gap-1.5">
            <button onClick={undo} disabled={!canUndo} className={`w-11 h-11 rounded-lg bg-bg3 border text-base flex items-center justify-center transition-all ${canUndo ? 'border-white/[0.08] text-text cursor-pointer hover:border-gold hover:text-gold' : 'border-white/[0.04] text-text-muted/40 cursor-default'}`} title="Undo (Ctrl+Z)">↩️</button>
            <button onClick={redo} disabled={!canRedo} className={`w-11 h-11 rounded-lg bg-bg3 border text-base flex items-center justify-center transition-all ${canRedo ? 'border-white/[0.08] text-text cursor-pointer hover:border-gold hover:text-gold' : 'border-white/[0.04] text-text-muted/40 cursor-default'}`} title="Redo (Ctrl+Shift+Z)">↪️</button>
            <button onClick={clearAllWaypoints} className="w-11 h-11 rounded-lg bg-bg3 border border-white/[0.08] text-text text-base flex items-center justify-center cursor-pointer hover:border-gold hover:text-gold transition-all" title="Clear all">🗑️</button>
          </div>
          {/* Hint — desktop only (mobile hint is in sidebar) */}
          <div className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 text-[11px] text-text-muted bg-bg/80 backdrop-blur px-3 py-1.5 rounded-lg pointer-events-none text-center">
            Right-click to add waypoints · Ctrl+Z undo · Ctrl+Shift+Z redo
          </div>
          {/* Legend — hidden on mobile */}
          {(() => {
            const usedModes = [...new Set(waypointList.filter(w => w.transport).map(w => w.transport!))];
            if (usedModes.length === 0) return null;
            return (
              <div className="hidden md:block absolute bottom-10 left-3 bg-bg/85 backdrop-blur border border-white/[0.08] rounded-lg px-3 py-2">
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Legend</div>
                {usedModes.map(mode => {
                  const s = getTransportStyle(mode);
                  return (
                    <div key={mode} className="flex items-center gap-2 py-0.5">
                      <div className="w-4 h-[3px] rounded" style={{ background: s.color, ...(s.dash ? { backgroundImage: `repeating-linear-gradient(90deg, ${s.color} 0px, ${s.color} 4px, transparent 4px, transparent 8px)`, background: 'none' } : {}) }} />
                      <span className="text-[11px] text-text">{s.emoji} {s.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Coords — hidden on mobile */}
          <div className="hidden md:block absolute bottom-3 left-3 text-[11px] text-text-muted bg-bg/80 backdrop-blur px-2 py-1 rounded">{coords}</div>
        </div>

        {/* Sidebar */}
        <div className="bg-bg2 border-t md:border-t-0 md:border-l border-white/[0.08] flex flex-col overflow-hidden max-h-[50vh] md:max-h-none">
          <div className="flex border-b border-white/[0.08] shrink-0">
            {(['route', 'stats', 'notes'] as const).map(tab => (
              <button key={tab} onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-3 text-center text-xs uppercase tracking-wider cursor-pointer border-b-2 transition-all ${sidebarTab === tab ? 'text-gold border-b-gold' : 'text-text-muted border-b-transparent'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Route tab */}
            {sidebarTab === 'route' && (
              <>
                <div className="text-[11px] text-text-muted mb-3"><strong className="text-text hidden md:inline">Right-click</strong><strong className="text-text md:hidden">Tap &amp; hold</strong> the map to add 📍 waypoints or ⭐ highlights</div>
                {waypointList.length === 0 ? (
                  <div className="text-center py-5 text-text-muted text-[13px]"><span className="hidden md:inline">Right-click</span><span className="md:hidden">Tap &amp; hold</span> the map to start building your route</div>
                ) : (
                  waypointList.map(w => {
                    const isH = w.type === 'highlight';
                    if (!isH) wpNum++;
                    const n = wpNum;
                    const ts = w.transport ? getTransportStyle(w.transport) : null;
                    const isExpanded = expandedWp === w.id;
                    const allImages = w.images?.length ? w.images : (w.imageData ? [w.imageData] : []);
                    return (
                      <React.Fragment key={w.id}>
                        {ts && n > 1 && (
                          <div className="flex items-center gap-2 ml-[10px] my-0.5">
                            <div className="w-[2px] h-3" style={{ background: ts.color }} />
                            <span className="text-[10px]" style={{ color: ts.color }}>{ts.emoji} {ts.label}</span>
                          </div>
                        )}
                        <div id={`sidebar-wp-${w.id}`} className={`rounded-[10px] bg-bg3 border mb-1 transition-colors ${isExpanded ? 'border-gold/40' : 'border-white/[0.08] hover:border-gold'}`}>
                          <div
                            onClick={() => { setExpandedWp(isExpanded ? null : w.id); flyToWaypoint(w.id); }}
                            className="flex items-center gap-2 p-2.5 cursor-pointer"
                          >
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${isH ? 'bg-teal text-bg' : 'bg-gold text-bg'}`}>
                              {isH ? '⭐' : n}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium truncate">{w.name || (isH ? 'Highlight' : `Waypoint ${n}`)}</div>
                              {!isExpanded && w.note && <div className="text-[11px] text-teal truncate">{w.note}</div>}
                              <div className="text-[11px] text-text-muted">
                                {w.lat.toFixed(3)}°, {w.lng.toFixed(3)}°
                                {!isExpanded && allImages.length > 0 && <span className="ml-1.5 text-gold/60">{allImages.length} photo{allImages.length > 1 ? 's' : ''}</span>}
                                {!isExpanded && (w.videos?.length || 0) > 0 && <span className="ml-1.5 text-teal/60">{w.videos!.length} video{w.videos!.length > 1 ? 's' : ''}</span>}
                              </div>
                            </div>
                            <span className={`text-text-muted text-[10px] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                            <button onClick={(e) => { e.stopPropagation(); removeWaypoint(w.id); }} className="text-text-muted hover:text-stamp-red text-base cursor-pointer shrink-0">×</button>
                          </div>
                          {isExpanded && (
                            <SidebarWaypointEditor
                              w={w}
                              isHighlight={isH}
                              wpIdx={isH ? -1 : n}
                              onUpdate={(updates) => {
                                const ref = waypointsRef.current.find(x => x.id === w.id);
                                if (!ref) return;
                                if (updates.name !== undefined) ref.name = updates.name;
                                if (updates.note !== undefined) ref.note = updates.note;
                                if (updates.transport !== undefined) ref.transport = updates.transport;
                                if (updates.images !== undefined) { ref.images = updates.images; ref.imageData = updates.images[0] || null; }
                                if (updates.videos !== undefined) ref.videos = updates.videos;
                                syncWaypointList();
                                updateRouteLine();
                                pushHistory();
                                setHasUnsaved(true);
                              }}
                              onDelete={() => removeWaypoint(w.id)}
                            />
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </>
            )}

            {/* Stats tab */}
            {sidebarTab === 'stats' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                    <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{stats.distance}</div>
                    <div className="text-[10px] text-text-muted uppercase">Distance</div>
                  </div>
                  <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                    <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{stats.waypoints}</div>
                    <div className="text-[10px] text-text-muted uppercase">Waypoints</div>
                  </div>
                  <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                    <div className="text-lg font-[family-name:var(--font-playfair)] text-gold">{stats.highlights}</div>
                    <div className="text-[10px] text-text-muted uppercase">Highlights</div>
                  </div>
                </div>

                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                    Elevation {elevStatus && <span className="text-teal ml-1">{elevStatus}</span>}
                  </div>
                  {elevation ? (
                    <>
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1 text-center"><div className="text-sm text-teal">+{Math.round(elevation.gain)}m</div><div className="text-[10px] text-text-muted">Gain</div></div>
                        <div className="flex-1 text-center"><div className="text-sm text-stamp-red">-{Math.round(elevation.loss)}m</div><div className="text-[10px] text-text-muted">Loss</div></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-text-muted mb-1"><span>↓ {Math.round(elevation.min)}m</span><span>↑ {Math.round(elevation.max)}m</span></div>
                      <div className="flex items-end gap-[2px] min-h-[60px] bg-white/[0.03] rounded-md p-1">
                        {elevation.elevations.map((e, i) => {
                          const range = elevation.max - elevation.min || 1;
                          const h = Math.max(4, Math.round(((e - elevation.min) / range) * 52));
                          return (
                            <div key={i} onClick={() => { const w = wps[i]; if (w) flyToWaypoint(w.id); }}
                              className="flex-1 bg-teal/60 hover:bg-teal rounded-t cursor-pointer transition-colors relative group"
                              style={{ height: h }}>
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-bg border border-white/[0.12] rounded px-1.5 py-0.5 text-[10px] text-text whitespace-nowrap z-10">
                                {Math.round(e)}m · {Math.round(cumDist[i] || 0)}km
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-text-muted text-xs">Add 2+ waypoints to see elevation</div>
                  )}
                </div>
              </div>
            )}

            {/* Notes tab */}
            {sidebarTab === 'notes' && (
              <div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Write about this journey..."
                  className="w-full min-h-[200px] bg-bg3 border border-white/[0.08] rounded-[10px] p-3 text-text text-[13px] leading-relaxed outline-none resize-y"
                />
                <button onClick={() => saveCurrentRoute(true)}
                  className="mt-2 w-full py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">
                  Save Notes
                </button>
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-white/[0.08] p-3 flex gap-2 shrink-0">
            <button onClick={fitRoute} className="flex-1 py-2 rounded-lg bg-teal/10 text-teal text-xs cursor-pointer hover:bg-teal/20 transition-all">Fit Route</button>
          </div>
        </div>
      </div>
    </div>
  );
}

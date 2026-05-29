'use client';

import { useEffect, useRef } from 'react';
import type { RouteWaypoint, TransportMode } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
let mapboxgl: any = null;

const TRANSPORT_COLORS: Record<string, { color: string; dash?: number[] }> = {
  plane: { color: '#60a5fa', dash: [8, 6] },
  train: { color: '#a855f7' },
  bus: { color: '#22c55e' },
  'sleeping-bus': { color: '#2dd4bf' },
  boat: { color: '#38bdf8' },
  cycling: { color: '#3b82f6' },
  hiking: { color: '#ef4444' },
  motorbike: { color: '#e879f9' },
  hitchhiking: { color: '#f59e0b' },
  car: { color: '#fb923c' },
  walking: { color: '#92400e', dash: [4, 4] },
};

function getColor(mode?: TransportMode) {
  if (!mode) return { color: '#c9a96e' };
  return TRANSPORT_COLORS[mode] || { color: '#c9a96e' };
}

interface Props {
  waypoints: RouteWaypoint[];
  mapboxToken: string;
  countryCode?: string;
}

export function PublicRouteMap({ waypoints, mapboxToken, countryCode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || waypoints.length === 0) return;
    let cancelled = false;

    async function init() {
      if (!mapboxgl) {
        const mod = await import('mapbox-gl');
        mapboxgl = mod.default || mod;
      }
      if (cancelled || !containerRef.current) return;

      (mapboxgl as any).accessToken = mapboxToken;
      const map = new (mapboxgl as any).Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [waypoints[0].lng, waypoints[0].lat],
        zoom: 5,
        interactive: true,
        attributionControl: false,
      });
      mapRef.current = map;

      map.addControl(new (mapboxgl as any).NavigationControl(), 'top-right');

      map.on('load', () => {
        const wps = waypoints.filter(w => w.type === 'waypoint');
        const highlights = waypoints.filter(w => w.type === 'highlight');

        // Draw route segments
        for (let i = 1; i < wps.length; i++) {
          const prev = wps[i - 1], curr = wps[i];
          const style = getColor(curr.transport);
          const srcId = `seg-${i}`;

          map.addSource(srcId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[prev.lng, prev.lat], [curr.lng, curr.lat]] },
              properties: {},
            },
          });
          map.addLayer({
            id: srcId + '-glow', type: 'line', source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': style.color, 'line-width': 6, 'line-opacity': 0.2 },
          });
          map.addLayer({
            id: srcId, type: 'line', source: srcId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': style.color, 'line-width': 3, 'line-opacity': 0.85,
              ...(style.dash ? { 'line-dasharray': style.dash as any } : {}),
            },
          });
        }

        // Add waypoint markers
        let wpNum = 0;
        waypoints.forEach(w => {
          const isH = w.type === 'highlight';
          if (!isH) wpNum++;

          const el = document.createElement('div');
          const thumb = w.images?.length ? w.images[0] : w.imageData;

          if (isH) {
            el.style.cssText = 'width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;';
            el.innerHTML = '<span style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))">⭐</span>';
          } else if (thumb) {
            el.style.cssText = 'width:36px;height:36px;cursor:pointer;';
            el.innerHTML = `<div style="width:34px;height:34px;border-radius:50%;border:2px solid var(--sm-gold);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5)"><img src="${thumb}" style="width:100%;height:100%;object-fit:cover"></div>`;
          } else {
            el.style.cssText = 'width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
            el.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:var(--sm-gold);border:2px solid var(--sm-text);box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--sm-bg);font-weight:700">${wpNum}</div>`;
          }

          const marker = new (mapboxgl as any).Marker({ element: el, anchor: 'center' })
            .setLngLat([w.lng, w.lat])
            .addTo(map);

          // Popup with name/note
          if (w.name || w.note) {
            const popupHTML = `<div style="font-family:'DM Sans',sans-serif;padding:4px;max-width:240px">
              ${w.name ? `<div style="font-weight:600;font-size:14px;color:var(--sm-text);margin-bottom:4px">${w.name}</div>` : ''}
              ${w.note ? `<div style="font-size:12px;color:var(--sm-text-muted);white-space:pre-wrap">${w.note}</div>` : ''}
            </div>`;
            const popup = new (mapboxgl as any).Popup({ offset: 16, closeButton: false, maxWidth: '260px' }).setHTML(popupHTML);
            marker.setPopup(popup);
          }
        });

        // Fit bounds
        if (waypoints.length > 1) {
          const bounds = new (mapboxgl as any).LngLatBounds();
          waypoints.forEach(w => bounds.extend([w.lng, w.lat]));
          map.fitBounds(bounds, { padding: 60, duration: 800 });
        }
      });

      setTimeout(() => map.resize(), 100);
    }

    init();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [waypoints, mapboxToken]);

  if (!mapboxToken || waypoints.length === 0) return null;

  return (
    <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden border border-white/[0.08]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

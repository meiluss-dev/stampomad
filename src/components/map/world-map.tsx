'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { numToAlpha, countryNames, countryFlag, getContinent, tinyCountries } from '@/lib/countries';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology } from 'topojson-specification';

export function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mapLoadedRef = useRef(false);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const { trips, visitedCountries, homebase, livedPlaces, toggleVisitedCountry } = useStore();
  const toggleRef = useRef(toggleVisitedCountry);
  toggleRef.current = toggleVisitedCountry;
  const visitedRef = useRef(visitedCountries);
  visitedRef.current = visitedCountries;

  const updateColors = useCallback(() => {
    if (!mapLoadedRef.current) return;
    const vc = new Set([...visitedCountries, ...trips.filter(t => !t.quickPin).map(t => t.code)]);
    const lc = new Set(livedPlaces.map(l => l.code));
    const hc = homebase?.code || null;

    d3.select(svgRef.current).select('#mapGroup').selectAll<SVGPathElement, d3.GeoPermissibleObjects>('.country')
      .each(function (d: any) {
        const a = numToAlpha[+d.id];
        const el = d3.select(this);
        el.classed('homebase', !!(a && a === hc));
        el.classed('lived-in', !!(a && a !== hc && lc.has(a)));
        el.classed('visited', !!(a && a !== hc && !lc.has(a) && vc.has(a)));
      });
  }, [trips, visitedCountries, homebase, livedPlaces]);

  useEffect(() => {
    if (mapLoadedRef.current) {
      updateColors();
      return;
    }

    async function init() {
      if (!svgRef.current) return;
      const world: Topology = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json') as Topology;
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const countries = topojson.feature(world, world.objects.countries as any);
      const projection = d3.geoNaturalEarth1().scale(153).translate([480, 250]);
      const path = d3.geoPath().projection(projection);
      const g = svg.append('g').attr('id', 'mapGroup');

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 12])
        .translateExtent([[0, 0], [960, 500]])
        .on('zoom', (event) => {
          g.attr('transform', event.transform.toString());
          g.selectAll('.country').attr('stroke-width', String(0.4 / event.transform.k));
        });

      zoomRef.current = zoom;
      svg.call(zoom);
      svg.on('dblclick.zoom', null);

      let isDragging = false;
      let dragStart = 0;

      svg.on('mousedown.drag', () => { isDragging = false; dragStart = Date.now(); });
      svg.on('mousemove.drag', () => { if (Date.now() - dragStart > 120) isDragging = true; });

      // Long-press for mobile (replaces right-click)
      let longPressTimer: ReturnType<typeof setTimeout> | null = null;
      let touchMoved = false;

      g.selectAll('.country')
        .data((countries as any).features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', path as any)
        .attr('data-num', (d: any) => d.id)
        .on('mousemove', function (event: MouseEvent, d: any) {
          const alpha = numToAlpha[+d.id];
          const name = alpha ? (countryNames[alpha] || alpha) : 'Unknown';
          const tooltip = tooltipRef.current;
          if (!tooltip) return;
          tooltip.querySelector('.tt-name')!.textContent = name;
          tooltip.querySelector('.tt-status')!.textContent =
            visitedRef.current.has(alpha) ? '📍 Visited — right-click to remove' : 'Right-click to mark as visited';
          tooltip.style.display = 'block';
          tooltip.style.left = (event.clientX + 14) + 'px';
          tooltip.style.top = (event.clientY - 10) + 'px';
        })
        .on('mouseleave', () => {
          if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        })
        .on('contextmenu', function (event: MouseEvent, d: any) {
          event.preventDefault();
          if (isDragging) return;
          const alpha = numToAlpha[+d.id];
          if (!alpha) return;
          toggleRef.current(alpha);
        })
        .on('touchstart', function (event: TouchEvent, d: any) {
          touchMoved = false;
          const alpha = numToAlpha[+d.id];
          if (!alpha) return;
          longPressTimer = setTimeout(() => {
            if (!touchMoved) {
              event.preventDefault();
              toggleRef.current(alpha);
              // Brief visual feedback
              d3.select(this).classed('map-pulse', true);
              setTimeout(() => d3.select(this).classed('map-pulse', false), 800);
            }
          }, 500);
        })
        .on('touchmove', function () {
          touchMoved = true;
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        })
        .on('touchend', function () {
          if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        });

      mapLoadedRef.current = true;
      updateColors();
    }

    init();
  }, [updateColors, visitedCountries]);

  function handleZoom(factor: number) {
    if (!zoomRef.current || !svgRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor);
  }

  function handleReset() {
    if (!zoomRef.current || !svgRef.current) return;
    d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity);
  }

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function highlightCountry(code: string) {
    if (!mapLoadedRef.current || !svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.select('#mapGroup').selectAll<SVGPathElement, any>('.country').each(function (d: any) {
      const alpha = numToAlpha[+d.id];
      if (alpha === code) {
        const bounds = this.getBBox();
        const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
        const size = Math.max(bounds.width, bounds.height);
        const scale = Math.min(8, Math.max(2, 120 / size));
        const tx = 480 - scale * cx, ty = 250 - scale * cy;
        svg.transition().duration(700).call(zoomRef.current!.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        d3.select(this).classed('map-pulse', true);
        setTimeout(() => d3.select(this).classed('map-pulse', false), 2000);
      }
    });
  }

  function selectResult(code: string) {
    setQuery('');
    setShowResults(false);
    highlightCountry(code);
    // For tiny countries, offer to pin directly
    if (tinyCountries.has(code) && !visitedCountries.has(code) && !trips.some(t => t.code === code)) {
      setTimeout(() => {
        if (confirm(`${countryNames[code] || code} is very small on the map — pin it as visited directly?`)) {
          toggleVisitedCountry(code);
        }
      }, 800);
    }
  }

  const searchResults = query.length >= 1 ? (() => {
    const ql = query.toLowerCase();
    const countries = Object.entries(countryNames)
      .filter(([code, name]) => name.toLowerCase().includes(ql) || code.toLowerCase() === ql)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(ql), bs = b.name.toLowerCase().startsWith(ql);
        return as && !bs ? -1 : !as && bs ? 1 : a.name.localeCompare(b.name);
      })
      .slice(0, 8);
    const cityMatches: { city: string; code: string; tripName: string }[] = [];
    const seen = new Set<string>();
    trips.forEach(t => {
      if (!t.cities) return;
      t.cities.split(',').map(c => c.trim()).forEach(city => {
        if (city.toLowerCase().includes(ql) && !seen.has(city.toLowerCase())) {
          seen.add(city.toLowerCase());
          cityMatches.push({ city, code: t.code, tripName: t.name });
        }
      });
    });
    trips.forEach(t => {
      if (t.name.toLowerCase().includes(ql) && !cityMatches.find(m => m.tripName === t.name)) {
        cityMatches.push({ city: t.name, code: t.code, tripName: t.name });
      }
    });
    return { countries, cities: cityMatches.slice(0, 4) };
  })() : { countries: [], cities: [] };

  function highlightText(text: string, q: string) {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return <>{text.slice(0, idx)}<mark className="bg-gold/30 text-text rounded-sm">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>;
  }

  function getStatus(code: string) {
    if (homebase?.code === code) return { label: '🏠 Home', cls: 'text-stamp-red' };
    if (livedPlaces.some(l => l.code === code)) return { label: 'Lived', cls: 'text-teal' };
    if (trips.some(t => t.code === code)) return { label: 'Visited', cls: 'text-gold' };
    return { label: 'Not visited', cls: 'text-text-muted' };
  }

  const allCodes = new Set([
    ...visitedCountries,
    ...trips.filter(t => !t.quickPin).map(t => t.code),
    ...livedPlaces.map(l => l.code),
    ...(homebase ? [homebase.code] : []),
  ]);

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl sm:rounded-[20px] p-3 sm:p-6 mb-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h3 className="text-[12px] sm:text-[13px] text-text-muted uppercase tracking-wider">
          <span className="hidden sm:inline">World map — right-click any country to pin it as visited</span>
          <span className="sm:hidden">World map · long-press to pin</span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted italic hidden sm:inline">
            {allCodes.size === 0 ? 'Right-click any country to pin it as visited' : `${allCodes.size} countr${allCodes.size === 1 ? 'y' : 'ies'} on your map`}
          </span>
          <div className="flex gap-1.5 items-center">
            <button onClick={() => handleZoom(1.5)} className="w-[30px] h-[30px] rounded-lg bg-bg4 border border-white/[0.08] text-text flex items-center justify-center cursor-pointer hover:bg-gold hover:text-bg hover:border-gold transition-all text-base">+</button>
            <button onClick={() => handleZoom(1 / 1.5)} className="w-[30px] h-[30px] rounded-lg bg-bg4 border border-white/[0.08] text-text flex items-center justify-center cursor-pointer hover:bg-gold hover:text-bg hover:border-gold transition-all text-base">−</button>
            <button onClick={handleReset} className="w-[30px] h-[30px] rounded-lg bg-bg4 border border-white/[0.08] text-text flex items-center justify-center cursor-pointer hover:bg-gold hover:text-bg hover:border-gold transition-all text-xs">⌂</button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div ref={searchRef} className="relative mb-3">
        <div className="flex items-center bg-bg4 border border-white/[0.08] rounded-xl px-3 gap-2">
          <span className="text-text-muted text-sm">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => query && setShowResults(true)}
            onKeyDown={e => { if (e.key === 'Escape') { setQuery(''); setShowResults(false); (e.target as HTMLInputElement).blur(); } }}
            placeholder="Search country or city name..."
            className="flex-1 bg-transparent border-none outline-none py-2.5 text-[13px] text-text placeholder:text-text-muted"
          />
          {query && (
            <button onClick={() => { setQuery(''); setShowResults(false); }} className="text-text-muted hover:text-text text-lg cursor-pointer bg-transparent border-none">×</button>
          )}
        </div>
        {showResults && query.length >= 1 && (searchResults.countries.length > 0 || searchResults.cities.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg2 border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 max-h-[300px] overflow-y-auto">
            {searchResults.cities.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider">Cities & trips</div>
                {searchResults.cities.map((m, i) => {
                  const st = getStatus(m.code);
                  return (
                    <button key={`city-${i}`} onClick={() => selectResult(m.code)} className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-bg3 cursor-pointer text-left transition-colors border-none bg-transparent">
                      <span className="text-lg">{countryFlag(m.code)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text truncate">{highlightText(m.city, query)}</div>
                        <div className="text-[11px] text-text-muted truncate">{m.tripName} · {countryNames[m.code] || m.code}</div>
                      </div>
                      <span className={`text-[11px] ${st.cls}`}>Trip</span>
                    </button>
                  );
                })}
              </>
            )}
            {searchResults.countries.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider">Countries</div>
                {searchResults.countries.map(m => {
                  const st = getStatus(m.code);
                  return (
                    <button key={m.code} onClick={() => selectResult(m.code)} className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-bg3 cursor-pointer text-left transition-colors border-none bg-transparent">
                      <span className="text-lg">{countryFlag(m.code)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-text truncate">{highlightText(m.name, query)}</div>
                        <div className="text-[11px] text-text-muted">{getContinent(m.code)}</div>
                      </div>
                      <span className={`text-[11px] ${st.cls}`}>{st.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
        {showResults && query.length >= 1 && searchResults.countries.length === 0 && searchResults.cities.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg2 border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50 px-4 py-3 text-[13px] text-text-muted">
            No results found
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 960 500"
        className="w-full h-auto block rounded-[10px] bg-[#0d1929] cursor-grab active:cursor-grabbing"
      >
        <text x="480" y="255" textAnchor="middle" fill="#7a8aa0" fontSize="14">Loading map data...</text>
      </svg>

      <div className="flex gap-3 sm:gap-4 mt-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <div className="w-3 h-3 rounded-sm bg-stamp-red" /> Home base
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <div className="w-3 h-3 rounded-sm bg-teal" /> Lived here
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <div className="w-3 h-3 rounded-sm bg-gold" /> Visited
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <div className="w-3 h-3 rounded-sm bg-[#1c2d47]" /> Not yet explored
        </div>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed bg-bg2/95 border border-white/[0.08] rounded-lg px-3.5 py-2 text-[13px] pointer-events-none hidden z-[999] backdrop-blur-[6px]"
      >
        <div className="tt-name font-medium text-text" />
        <div className="tt-status text-[11px] text-text-muted mt-0.5" />
      </div>
    </div>
  );
}

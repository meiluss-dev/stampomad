'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { numToAlpha, countryNames } from '@/lib/countries';

interface GlobeProps {
  visitedCodes: string[];
  countryCounts: Record<string, number>;
}

export function Globe({ visitedCodes, countryCounts }: GlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const rotationRef = useRef<[number, number, number]>([-15, -40, 0]);
  const isDragging = useRef(false);
  const autoRotate = useRef(true);
  const frameRef = useRef<number>(0);

  const visitedSet = useRef(new Set(visitedCodes));
  visitedSet.current = new Set(visitedCodes);

  const render = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const node = svgRef.current;
    if (!node) return;

    const width = node.clientWidth;
    const height = node.clientHeight;
    const size = Math.min(width, height);
    const projection = d3.geoOrthographic()
      .scale(size / 2.15)
      .translate([width / 2, height / 2])
      .rotate(rotationRef.current)
      .clipAngle(90);

    const path = d3.geoPath(projection);

    // Ocean glow
    svg.select<SVGCircleElement>('.globe-ocean')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', projection.scale());

    // Graticule
    svg.select<SVGPathElement>('.globe-graticule')
      .attr('d', path(d3.geoGraticule10()) || '');

    // Countries
    svg.selectAll<SVGPathElement, GeoJSON.Feature>('.country')
      .attr('d', d => path(d) || '');

    // Glow ring
    svg.select<SVGCircleElement>('.globe-ring')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', projection.scale());
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const node = svgRef.current;
    if (!node) return;

    const width = node.clientWidth;
    const height = node.clientHeight;
    const size = Math.min(width, height);

    // Setup projection
    const projection = d3.geoOrthographic()
      .scale(size / 2.15)
      .translate([width / 2, height / 2])
      .rotate(rotationRef.current)
      .clipAngle(90);

    // Defs for glow
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'globe-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const radialGrad = defs.append('radialGradient').attr('id', 'ocean-grad');
    radialGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1a2a3a');
    radialGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0d1520');

    // Ocean
    svg.append('circle')
      .attr('class', 'globe-ocean')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', projection.scale())
      .attr('fill', 'url(#ocean-grad)')
      .attr('stroke', 'none');

    // Graticule
    svg.append('path')
      .attr('class', 'globe-graticule')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.04)')
      .attr('stroke-width', 0.5);

    // Load world data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then((world: Topology) => {
        const countries = feature(world, world.objects.countries as any);

        svg.selectAll('.country')
          .data((countries as any).features as GeoJSON.Feature[])
          .enter()
          .append('path')
          .attr('class', 'country')
          .attr('fill', (d: any) => {
            const alpha = numToAlpha[Number(d.id)];
            if (alpha && visitedSet.current.has(alpha)) {
              return 'var(--sm-gold, #c9a96e)';
            }
            return 'rgba(255,255,255,0.06)';
          })
          .attr('stroke', (d: any) => {
            const alpha = numToAlpha[Number(d.id)];
            if (alpha && visitedSet.current.has(alpha)) {
              return 'rgba(201,169,110,0.5)';
            }
            return 'rgba(255,255,255,0.08)';
          })
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .style('transition', 'fill 0.2s')
          .on('mouseenter', function (event: MouseEvent, d: any) {
            const alpha = numToAlpha[Number(d.id)];
            const isVisited = alpha && visitedSet.current.has(alpha);
            const name = alpha ? countryNames[alpha] : '';

            if (!isVisited) {
              d3.select(this).attr('fill', 'rgba(255,255,255,0.12)');
            } else {
              d3.select(this).attr('fill', 'var(--sm-gold-light, #f0d090)');
            }

            const tooltip = tooltipRef.current;
            if (tooltip && name) {
              const count = alpha ? (countryCounts[alpha] || 0) : 0;
              tooltip.innerHTML = isVisited
                ? `<strong>${name}</strong><br/><span style="color:var(--sm-gold)">${count} traveler${count !== 1 ? 's' : ''} visited</span>`
                : `<strong>${name}</strong>`;
              tooltip.style.opacity = '1';
              tooltip.style.left = event.clientX + 12 + 'px';
              tooltip.style.top = event.clientY - 10 + 'px';
            }

            autoRotate.current = false;
          })
          .on('mousemove', function (event: MouseEvent) {
            const tooltip = tooltipRef.current;
            if (tooltip) {
              tooltip.style.left = event.clientX + 12 + 'px';
              tooltip.style.top = event.clientY - 10 + 'px';
            }
          })
          .on('mouseleave', function (_: MouseEvent, d: any) {
            const alpha = numToAlpha[Number(d.id)];
            const isVisited = alpha && visitedSet.current.has(alpha);
            d3.select(this).attr('fill', isVisited
              ? 'var(--sm-gold, #c9a96e)'
              : 'rgba(255,255,255,0.06)');
            const tooltip = tooltipRef.current;
            if (tooltip) tooltip.style.opacity = '0';
            // Resume rotation after a delay
            setTimeout(() => { if (!isDragging.current) autoRotate.current = true; }, 2000);
          });

        // Outer ring glow
        svg.append('circle')
          .attr('class', 'globe-ring')
          .attr('cx', width / 2)
          .attr('cy', height / 2)
          .attr('r', projection.scale())
          .attr('fill', 'none')
          .attr('stroke', 'var(--sm-gold, #c9a96e)')
          .attr('stroke-width', 1)
          .attr('opacity', 0.15)
          .attr('filter', 'url(#globe-glow)');

        setLoaded(true);
        render();
      });

    // Drag to rotate
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('start', () => {
        isDragging.current = true;
        autoRotate.current = false;
      })
      .on('drag', (event) => {
        const k = 0.4;
        rotationRef.current = [
          rotationRef.current[0] + event.dx * k,
          Math.max(-60, Math.min(60, rotationRef.current[1] - event.dy * k)),
          0,
        ];
        render();
      })
      .on('end', () => {
        isDragging.current = false;
        setTimeout(() => { autoRotate.current = true; }, 3000);
      });

    svg.call(drag as any);

    // Auto-rotation
    function animate() {
      if (autoRotate.current) {
        rotationRef.current = [
          rotationRef.current[0] + 0.15,
          rotationRef.current[1],
          0,
        ];
        render();
      }
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);

    // Resize
    const observer = new ResizeObserver(() => render());
    observer.observe(node);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      svg.selectAll('*').remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto">
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--sm-gold) 0%, transparent 70%)' }}
      />
      <svg
        ref={svgRef}
        className={`w-full h-full transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ overflow: 'visible' }}
      />
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[999] pointer-events-none px-3 py-2 rounded-lg text-sm leading-snug opacity-0 transition-opacity duration-150"
        style={{
          background: 'color-mix(in srgb, var(--sm-bg) 92%, transparent)',
          border: '1px solid var(--sm-border)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      />
      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Offline maps — pre-cache Mapbox tiles for a trip's area.
 * Downloads tile images into the Cache API so they load offline.
 *
 * Strategy: compute bounding box from route waypoints,
 * then fetch tiles at zoom levels 5–12 (country → street level).
 */

const CACHE_NAME = 'stampomad-maps-v1';
const MAPBOX_STYLE = 'mapbox/dark-v11'; // matches app theme

interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Compute bounding box from coordinates with padding */
export function computeBBox(coords: { lng: number; lat: number }[], padding = 0.5): BBox {
  if (coords.length === 0) {
    // Default to world view
    return { minLng: -180, minLat: -60, maxLng: 180, maxLat: 75 };
  }

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const { lng, lat } of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return {
    minLng: Math.max(-180, minLng - padding),
    minLat: Math.max(-85, minLat - padding),
    maxLng: Math.min(180, maxLng + padding),
    maxLat: Math.min(85, maxLat + padding),
  };
}

/** Convert lat/lng to tile coordinates at a given zoom */
function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/** Get all tile coordinates for a bbox at a given zoom level */
function getTilesForBBox(bbox: BBox, zoom: number): { x: number; y: number; z: number }[] {
  const topLeft = lngLatToTile(bbox.minLng, bbox.maxLat, zoom);
  const bottomRight = lngLatToTile(bbox.maxLng, bbox.minLat, zoom);
  const tiles: { x: number; y: number; z: number }[] = [];

  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}

/** Estimate the number of tiles that would be downloaded */
export function estimateTileCount(
  coords: { lng: number; lat: number }[],
  zoomLevels: number[] = [5, 6, 7, 8, 9, 10],
): number {
  const bbox = computeBBox(coords, 0.3);
  let total = 0;
  for (const z of zoomLevels) {
    total += getTilesForBBox(bbox, z).length;
  }
  return total;
}

/**
 * Download map tiles for offline use.
 * @param token Mapbox access token
 * @param coords Array of {lng, lat} points (from route waypoints)
 * @param zoomLevels Which zoom levels to cache (default: 5–10 for regional + city detail)
 * @param onProgress Callback for download progress
 * @returns Number of tiles cached
 */
export async function downloadMapTiles(
  token: string,
  coords: { lng: number; lat: number }[],
  zoomLevels: number[] = [5, 6, 7, 8, 9, 10],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  if (!token) throw new Error('Mapbox token required');
  if (coords.length === 0) throw new Error('No coordinates provided');

  const bbox = computeBBox(coords, 0.3);
  const cache = await caches.open(CACHE_NAME);

  let allTiles: { x: number; y: number; z: number }[] = [];
  for (const z of zoomLevels) {
    allTiles = allTiles.concat(getTilesForBBox(bbox, z));
  }

  // Cap at 500 tiles to avoid excessive downloads
  if (allTiles.length > 500) {
    // Reduce zoom levels if too many tiles
    allTiles = allTiles.slice(0, 500);
  }

  let done = 0;
  let cached = 0;

  // Download in batches of 6 (respect Mapbox rate limits)
  const batchSize = 6;
  for (let i = 0; i < allTiles.length; i += batchSize) {
    const batch = allTiles.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ({ x, y, z }) => {
        const url = `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/256/${z}/${x}/${y}?access_token=${token}`;
        try {
          const existing = await cache.match(url);
          if (!existing) {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              cached++;
            }
          } else {
            cached++;
          }
        } catch {
          // Skip failed tiles
        }
        done++;
        onProgress?.(done, allTiles.length);
      }),
    );
  }

  return cached;
}

/** Remove cached map tiles */
export async function clearMapCache(): Promise<void> {
  await caches.delete(CACHE_NAME);
}

/** Check if map tiles are cached for given coordinates */
export async function hasMapCache(
  token: string,
  coords: { lng: number; lat: number }[],
): Promise<boolean> {
  if (!token || coords.length === 0) return false;
  const bbox = computeBBox(coords, 0.3);
  const cache = await caches.open(CACHE_NAME);
  // Check if a representative tile at zoom 8 is cached
  const tile = lngLatToTile(
    (bbox.minLng + bbox.maxLng) / 2,
    (bbox.minLat + bbox.maxLat) / 2,
    8,
  );
  const url = `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/256/8/${tile.x}/${tile.y}?access_token=${token}`;
  const existing = await cache.match(url);
  return !!existing;
}

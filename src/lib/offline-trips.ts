/**
 * Offline trip packs — download a trip's full data for offline access.
 * Stores trip metadata, journal, route in IndexedDB.
 * Caches photos via service worker cache API.
 */

import type { Trip, RouteData } from '@/types';

const DB_NAME = 'stampomad-offline';
const DB_VERSION = 2;
const TRIPS_STORE = 'offline-trips';
const CACHE_NAME = 'stampomad-v4';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-ops')) {
        db.createObjectStore('pending-ops', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(TRIPS_STORE)) {
        db.createObjectStore(TRIPS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflineTripPack {
  id: number;
  trip: Trip;
  route: RouteData | null;
  photos: string[]; // URLs cached in SW cache
  downloadedAt: string;
}

/** Save a trip pack to IndexedDB and cache photos */
export async function downloadTripForOffline(
  trip: Trip,
  route: RouteData | null,
  photos: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  // 1. Cache photo URLs via Cache API
  const cache = await caches.open(CACHE_NAME);
  const photoUrls = photos.filter(p => p.startsWith('http'));
  let cached = 0;

  for (const url of photoUrls) {
    try {
      // Check if already cached
      const existing = await cache.match(url);
      if (!existing) {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      }
      cached++;
      onProgress?.(cached, photoUrls.length);
    } catch (err) {
      console.warn('[Stampomad] Failed to cache photo:', url, err);
      cached++;
      onProgress?.(cached, photoUrls.length);
    }
  }

  // 2. Store trip data in IndexedDB
  const pack: OfflineTripPack = {
    id: trip.id,
    trip,
    route,
    photos,
    downloadedAt: new Date().toISOString(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRIPS_STORE, 'readwrite');
    tx.objectStore(TRIPS_STORE).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Check if a trip has been downloaded for offline */
export async function isDownloaded(tripId: number): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TRIPS_STORE, 'readonly');
      const req = tx.objectStore(TRIPS_STORE).get(tripId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** Load a downloaded trip pack */
export async function loadOfflineTripPack(tripId: number): Promise<OfflineTripPack | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TRIPS_STORE, 'readonly');
      const req = tx.objectStore(TRIPS_STORE).get(tripId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Get all downloaded trip packs */
export async function getAllOfflineTrips(): Promise<OfflineTripPack[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(TRIPS_STORE, 'readonly');
      const req = tx.objectStore(TRIPS_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/** Remove a downloaded trip pack and its cached photos */
export async function removeOfflineTripPack(tripId: number): Promise<void> {
  try {
    // Remove cached photos
    const pack = await loadOfflineTripPack(tripId);
    if (pack) {
      const cache = await caches.open(CACHE_NAME);
      for (const url of pack.photos.filter(p => p.startsWith('http'))) {
        await cache.delete(url).catch(() => {});
      }
    }

    // Remove from IndexedDB
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRIPS_STORE, 'readwrite');
      tx.objectStore(TRIPS_STORE).delete(tripId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

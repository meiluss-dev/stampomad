export interface Trip {
  id: number;
  name: string;
  code: string;
  continent: string;
  emoji: string;
  start: string;
  end: string;
  days: number;
  cities: string;
  notes: string;
  quickPin: boolean;
  fromCode?: string;
  published?: boolean;
  journal: JournalEntry[];
}

export interface JournalEntry {
  id: number;
  date: string;
  time: string;
  title: string;
  text: string;
}

export interface Homebase {
  city: string;
  code: string;
  continent: string;
  flag: string;
}

export interface LivedPlace {
  id: number;
  city: string;
  code: string;
  continent: string;
  flag: string;
  from: string;
  to: string | null;
}

export interface PackingItem {
  id: number;
  text: string;
  checked: boolean;
  category: string;
}

export interface PackingList {
  tripId: number;
  items: PackingItem[];
}

export type TransportMode = 'plane' | 'train' | 'bus' | 'boat' | 'cycling' | 'hiking' | 'motorbike' | 'hitchhiking' | 'car' | 'walking' | 'sleeping-bus';

export interface RouteWaypoint {
  id: string;
  lng: number;
  lat: number;
  type: 'waypoint' | 'highlight';
  name: string;
  note?: string;
  transport?: TransportMode;
  imageData: string | null;
  images?: string[];
  videos?: string[];
}

export interface RouteData {
  waypoints: RouteWaypoint[];
  notes: string;
}

export interface UserSettings {
  homebase: Homebase | null;
  livedPlaces: LivedPlace[];
  clocks: ClockEntry[];
  lang: string;
  translations: Record<string, Record<string, string>>;
  mapboxToken: string;
  anthropicKey: string;
}

export interface ClockEntry {
  tz: string;
  label: string;
  city: string;
}

export interface AppState {
  trips: Trip[];
  visitedCountries: Set<string>;
  homebase: Homebase | null;
  livedPlaces: LivedPlace[];
  routes: Record<number, RouteData>;
  tripPhotos: Record<number, string[]>;
  clocks: ClockEntry[];
  currentLang: string;
  translations: Record<string, Record<string, string>>;
  mapboxToken: string;
  anthropicKey: string;
}

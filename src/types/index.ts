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
  fromCity?: string;
  toCity?: string;
  travelStyle?: string;
  rating?: number;
  published?: boolean;
  isGroup?: boolean;
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

// ── Group Trips ──

export type MemberRole = 'owner' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface TripMember {
  id: number;
  tripId: number;
  userId: string;
  role: MemberRole;
  status: InviteStatus;
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
  username: string;
}

export interface TripExpense {
  id: number;
  tripId: number;
  paidBy: string; // user_id
  paidByName: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  splitType: 'equal' | 'custom';
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface ExpenseSplit {
  userId: string;
  displayName: string;
  amount: number;
  settled: boolean;
}

export interface SharedItem {
  id: number;
  tripId: number;
  text: string;
  category: string;
  assignedTo: string | null; // user_id
  assignedName: string | null;
  claimedBy: string | null; // user_id
  claimedName: string | null;
  checked: boolean;
}

export interface GroupInvite {
  id: number;
  tripId: number;
  tripName: string;
  tripEmoji: string;
  tripCode: string;
  inviterName: string;
  inviterAvatar: string | null;
  status: InviteStatus;
  createdAt: string;
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

import type { Trip, Homebase, LivedPlace } from '@/types';
import { getContinent } from '@/lib/countries';

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: 'countries' | 'trips' | 'journal' | 'milestones' | 'special';
}

export interface EarnedBadge extends Badge {
  earned: true;
}

export interface LockedBadge extends Badge {
  earned: false;
  progress?: string;
}

type BadgeResult = EarnedBadge | LockedBadge;

export function computeBadges(
  trips: Trip[],
  visitedCountries: Set<string>,
  homebase: Homebase | null,
  livedPlaces: LivedPlace[],
): BadgeResult[] {
  const real = trips.filter(t => !t.quickPin);
  const allCodes = new Set([...visitedCountries, ...real.map(t => t.code)]);
  const totalCountries = allCodes.size;
  const totalTrips = real.length;
  const totalDays = real.reduce((a, t) => a + t.days, 0);
  const totalEntries = real.reduce((a, t) => a + (t.journal?.length || 0), 0);
  const continents = new Set([...allCodes].map(c => getContinent(c)).filter(c => c !== 'Other'));
  const hasPhotos = real.some(t => t.journal?.some(e => e.title || e.text));
  const longestTrip = real.reduce((a, t) => Math.max(a, t.days), 0);

  const badges: BadgeResult[] = [];

  function add(badge: Badge, condition: boolean, progress?: string) {
    badges.push(condition ? { ...badge, earned: true } : { ...badge, earned: false, progress });
  }

  // Country milestones
  add({ id: 'first-stamp', icon: '📍', name: 'First Stamp', description: 'Visit your first country', category: 'countries' },
    totalCountries >= 1, `${totalCountries}/1`);
  add({ id: 'five-nations', icon: '🌍', name: 'Five Nations', description: 'Visit 5 countries', category: 'countries' },
    totalCountries >= 5, `${totalCountries}/5`);
  add({ id: 'double-digits', icon: '🔟', name: 'Double Digits', description: 'Visit 10 countries', category: 'countries' },
    totalCountries >= 10, `${totalCountries}/10`);
  add({ id: 'quarter-world', icon: '🌏', name: 'Quarter of the World', description: 'Visit 25 countries', category: 'countries' },
    totalCountries >= 25, `${totalCountries}/25`);
  add({ id: 'half-century', icon: '🏅', name: 'Half Century', description: 'Visit 50 countries', category: 'countries' },
    totalCountries >= 50, `${totalCountries}/50`);
  add({ id: 'century-club', icon: '💯', name: 'Century Club', description: 'Visit 100 countries', category: 'countries' },
    totalCountries >= 100, `${totalCountries}/100`);

  // Continent badges
  add({ id: 'two-continents', icon: '✈️', name: 'Continental', description: 'Visit 2 continents', category: 'countries' },
    continents.size >= 2, `${continents.size}/2`);
  add({ id: 'four-continents', icon: '🗺️', name: 'Globe Trotter', description: 'Visit 4 continents', category: 'countries' },
    continents.size >= 4, `${continents.size}/4`);
  add({ id: 'all-continents', icon: '🌐', name: 'All Continents', description: 'Visit all 5 inhabited continents', category: 'countries' },
    continents.size >= 5, `${continents.size}/5`);

  // Trip milestones
  add({ id: 'first-trip', icon: '🧳', name: 'First Adventure', description: 'Log your first trip', category: 'trips' },
    totalTrips >= 1, `${totalTrips}/1`);
  add({ id: 'five-trips', icon: '🎒', name: 'Frequent Flyer', description: 'Log 5 trips', category: 'trips' },
    totalTrips >= 5, `${totalTrips}/5`);
  add({ id: 'ten-trips', icon: '🛫', name: 'Seasoned Traveler', description: 'Log 10 trips', category: 'trips' },
    totalTrips >= 10, `${totalTrips}/10`);
  add({ id: 'twenty-trips', icon: '🌟', name: 'Road Warrior', description: 'Log 20 trips', category: 'trips' },
    totalTrips >= 20, `${totalTrips}/20`);

  // Duration badges
  add({ id: 'week-abroad', icon: '📅', name: 'Week Abroad', description: 'Spend 7+ days on a single trip', category: 'trips' },
    longestTrip >= 7);
  add({ id: 'month-abroad', icon: '🗓️', name: 'Month Abroad', description: 'Spend 30+ days on a single trip', category: 'trips' },
    longestTrip >= 30);
  add({ id: 'hundred-days', icon: '⏳', name: '100 Days Out', description: 'Total 100 days of travel', category: 'trips' },
    totalDays >= 100, `${totalDays}/100`);
  add({ id: 'year-abroad', icon: '🎊', name: 'Year Abroad', description: 'Total 365 days of travel', category: 'trips' },
    totalDays >= 365, `${totalDays}/365`);

  // Journal badges
  add({ id: 'first-entry', icon: '✏️', name: 'Dear Diary', description: 'Write your first journal entry', category: 'journal' },
    totalEntries >= 1, `${totalEntries}/1`);
  add({ id: 'ten-entries', icon: '📝', name: 'Storyteller', description: 'Write 10 journal entries', category: 'journal' },
    totalEntries >= 10, `${totalEntries}/10`);
  add({ id: 'fifty-entries', icon: '📖', name: 'Author', description: 'Write 50 journal entries', category: 'journal' },
    totalEntries >= 50, `${totalEntries}/50`);

  // Special
  add({ id: 'home-set', icon: '🏠', name: 'Home Sweet Home', description: 'Set your home base', category: 'milestones' },
    !!homebase);
  add({ id: 'expat', icon: '🏘️', name: 'Expat Life', description: 'Add a place you\'ve lived', category: 'milestones' },
    livedPlaces.length >= 1);
  add({ id: 'nomad', icon: '🌎', name: 'Digital Nomad', description: 'Live in 3+ countries', category: 'milestones' },
    livedPlaces.length >= 3, `${livedPlaces.length}/3`);

  return badges;
}

// ═══════════════════════════════════════════════════════════
// Feature Flags — single source of truth for free/premium split
// ═══════════════════════════════════════════════════════════

export type Tier = 'free' | 'premium' | 'lifetime';
export type FeatureKey =
  | 'group_trips'
  | 'ai_translator'
  | 'csv_export'
  | 'budget_tracker'
  | 'route_maps'
  | 'photo_gallery'
  | 'public_profile'
  | 'packing_lists'
  | 'journal'
  | 'world_clock'
  | 'currency_converter'
  | 'trip_countdown'
  | 'unlimited_trips'
  | 'custom_themes';

export interface FeatureConfig {
  key: FeatureKey;
  name: string;
  description: string;
  tier: 'free' | 'premium';       // minimum tier required
  freeLimit?: number;              // optional usage limit on free tier (null = unlimited)
  icon: string;
}

// ── Feature Registry ──
// Change tier here to gate/ungate features. Everything is 'free' now.
// When ready to monetize, flip individual features to 'premium'.

export const FEATURES: Record<FeatureKey, FeatureConfig> = {
  // ── Currently Free (core features) ──
  journal: {
    key: 'journal',
    name: 'Trip Journal',
    description: 'Write journal entries for your trips',
    tier: 'free',
    icon: '📝',
  },
  public_profile: {
    key: 'public_profile',
    name: 'Public Profile',
    description: 'Share your travel profile with the world',
    tier: 'free',
    icon: '🌐',
  },
  world_clock: {
    key: 'world_clock',
    name: 'World Clock',
    description: 'Track time across cities',
    tier: 'free',
    icon: '🕐',
  },
  currency_converter: {
    key: 'currency_converter',
    name: 'Currency Converter',
    description: 'Convert between currencies',
    tier: 'free',
    icon: '💱',
  },
  trip_countdown: {
    key: 'trip_countdown',
    name: 'Trip Countdown',
    description: 'Countdown to your next adventure',
    tier: 'free',
    icon: '⏳',
  },
  packing_lists: {
    key: 'packing_lists',
    name: 'Packing Lists',
    description: 'Organize what to bring on each trip',
    tier: 'free',
    icon: '🧳',
  },

  // ── Premium-Ready (currently free, flip to 'premium' when ready) ──
  group_trips: {
    key: 'group_trips',
    name: 'Group Trips',
    description: 'Invite friends, split expenses, plan together',
    tier: 'free',   // flip to 'premium' to gate
    icon: '👥',
  },
  ai_translator: {
    key: 'ai_translator',
    name: 'AI Translator',
    description: 'Translate phrases with AI in any language',
    tier: 'free',   // flip to 'premium' to gate
    icon: '🤖',
  },
  csv_export: {
    key: 'csv_export',
    name: 'CSV Export',
    description: 'Export your travel data as spreadsheets',
    tier: 'free',   // flip to 'premium' to gate
    icon: '📊',
  },
  budget_tracker: {
    key: 'budget_tracker',
    name: 'Trip Budget',
    description: 'Track spending and set budgets per trip',
    tier: 'free',   // flip to 'premium' to gate
    icon: '💰',
  },
  route_maps: {
    key: 'route_maps',
    name: 'Route Maps',
    description: 'Draw routes and pin waypoints on maps',
    tier: 'free',   // flip to 'premium' to gate
    icon: '🗺️',
  },
  photo_gallery: {
    key: 'photo_gallery',
    name: 'Photo Gallery',
    description: 'Upload and organize trip photos',
    tier: 'free',   // flip to 'premium' to gate
    freeLimit: 50,  // e.g. 50 photos on free, unlimited on premium
    icon: '📸',
  },
  unlimited_trips: {
    key: 'unlimited_trips',
    name: 'Unlimited Trips',
    description: 'Log unlimited detailed trips',
    tier: 'free',   // flip to 'premium' to gate
    freeLimit: 20,  // e.g. 20 trips on free
    icon: '✈️',
  },
  custom_themes: {
    key: 'custom_themes',
    name: 'Custom Themes',
    description: 'Unlock additional color themes',
    tier: 'free',   // flip to 'premium' to gate
    icon: '🎨',
  },
};

// ── Helpers ──

export function getFeature(key: FeatureKey): FeatureConfig {
  return FEATURES[key];
}

export function isFeatureFree(key: FeatureKey): boolean {
  return FEATURES[key].tier === 'free';
}

export function getPremiumFeatures(): FeatureConfig[] {
  return Object.values(FEATURES).filter(f => f.tier === 'premium');
}

export function getFreeFeatures(): FeatureConfig[] {
  return Object.values(FEATURES).filter(f => f.tier === 'free');
}

/** Check if a tier has access to a feature */
export function tierHasAccess(userTier: Tier, featureKey: FeatureKey): boolean {
  if (userTier === 'premium' || userTier === 'lifetime') return true;
  return FEATURES[featureKey].tier === 'free';
}

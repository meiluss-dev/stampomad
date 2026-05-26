'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import type { Tier, FeatureKey } from '@/lib/features';
import { FEATURES, tierHasAccess } from '@/lib/features';
import { trackGateHit } from '@/lib/tracking';

interface UserFeatureState {
  tier: Tier;
  loading: boolean;
  overrides: Map<string, boolean>;
}

// Module-level cache so we don't refetch on every hook mount
let cachedState: UserFeatureState | null = null;
let fetchPromise: Promise<void> | null = null;

function fetchTier(userId: string): Promise<void> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    const supabase = createClient();
    const [tierResult, overridesResult] = await Promise.all([
      supabase.from('user_tiers').select('tier, expires_at').eq('user_id', userId).single(),
      supabase.from('feature_overrides').select('feature, enabled').eq('user_id', userId),
    ]);

    let tier: Tier = 'free';
    if (tierResult.data) {
      const { tier: t, expires_at } = tierResult.data;
      // Check if subscription expired
      if (expires_at && new Date(expires_at) < new Date()) {
        tier = 'free';
      } else {
        tier = t as Tier;
      }
    }

    const overrides = new Map<string, boolean>();
    (overridesResult.data || []).forEach(o => overrides.set(o.feature, o.enabled));

    cachedState = { tier, loading: false, overrides };
  })();
  return fetchPromise;
}

/**
 * Hook: check if the current user has access to a specific feature.
 *
 * Returns { hasAccess, tier, loading, isPremiumFeature }
 */
export function useFeature(featureKey: FeatureKey) {
  const { user } = useStore();
  const [state, setState] = useState<UserFeatureState>(
    cachedState || { tier: 'free', loading: true, overrides: new Map() }
  );

  useEffect(() => {
    if (!user) {
      setState({ tier: 'free', loading: false, overrides: new Map() });
      return;
    }
    if (cachedState) {
      setState(cachedState);
      return;
    }
    fetchTier(user.id).then(() => {
      if (cachedState) setState(cachedState);
    }).catch(() => {
      setState({ tier: 'free', loading: false, overrides: new Map() });
    });
  }, [user]);

  const feature = FEATURES[featureKey];
  const isPremiumFeature = feature.tier === 'premium';

  // Check override first
  const override = state.overrides.get(featureKey);
  const hasAccess = override !== undefined
    ? override
    : tierHasAccess(state.tier, featureKey);

  return {
    hasAccess,
    tier: state.tier,
    loading: state.loading,
    isPremiumFeature,
    feature,
  };
}

/**
 * Hook: get the user's current tier
 */
export function useTier() {
  const { user } = useStore();
  const [state, setState] = useState<UserFeatureState>(
    cachedState || { tier: 'free', loading: true, overrides: new Map() }
  );

  useEffect(() => {
    if (!user) {
      setState({ tier: 'free', loading: false, overrides: new Map() });
      return;
    }
    if (cachedState) {
      setState(cachedState);
      return;
    }
    fetchTier(user.id).then(() => {
      if (cachedState) setState(cachedState);
    }).catch(() => {
      setState({ tier: 'free', loading: false, overrides: new Map() });
    });
  }, [user]);

  return { tier: state.tier, loading: state.loading, isPremium: state.tier !== 'free' };
}

/** Clear cached tier (call on sign out or tier change) */
export function clearTierCache() {
  cachedState = null;
  fetchPromise = null;
}

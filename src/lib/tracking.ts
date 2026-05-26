// ═══════════════════════════════════════════════════════════
// Usage Tracking — anonymous feature usage events
// Fire-and-forget: never blocks UI, fails silently
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client';
import type { FeatureKey } from '@/lib/features';

type TrackAction = 'use' | 'view' | 'create' | 'gate_hit';

interface TrackEvent {
  feature: FeatureKey;
  action?: TrackAction;
  metadata?: Record<string, string | number | boolean>;
}

// Dedup buffer: prevent spamming the same event within a short window
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 5_000; // 5 seconds

function dedupeKey(feature: string, action: string): string {
  return `${feature}:${action}`;
}

/**
 * Track a feature usage event. Fire-and-forget.
 * Deduplicates rapid-fire events within 5s window.
 */
export function trackFeatureUsage(event: TrackEvent): void {
  const action = event.action || 'use';
  const key = dedupeKey(event.feature, action);

  // Dedup check
  const lastFired = recentEvents.get(key);
  if (lastFired && Date.now() - lastFired < DEDUP_WINDOW_MS) return;
  recentEvents.set(key, Date.now());

  // Clean old entries periodically
  if (recentEvents.size > 100) {
    const now = Date.now();
    for (const [k, t] of recentEvents) {
      if (now - t > DEDUP_WINDOW_MS * 2) recentEvents.delete(k);
    }
  }

  // Fire and forget
  _sendEvent(event.feature, action, event.metadata).catch(() => {});
}

async function _sendEvent(
  feature: string,
  action: TrackAction,
  metadata?: Record<string, string | number | boolean>
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('usage_events').insert({
    user_id: user.id,
    feature,
    action,
    metadata: metadata || {},
  });
}

/**
 * Track when a user hits a premium gate (tried to access a premium feature on free tier).
 * This is gold for monetization — shows demand for premium features.
 */
export function trackGateHit(feature: FeatureKey): void {
  trackFeatureUsage({ feature, action: 'gate_hit' });
}

/**
 * Track a feature view (e.g. opened budget modal, viewed group panel)
 */
export function trackView(feature: FeatureKey): void {
  trackFeatureUsage({ feature, action: 'view' });
}

/**
 * Track a creation event (e.g. created a trip, added journal entry)
 */
export function trackCreate(feature: FeatureKey, metadata?: Record<string, string | number | boolean>): void {
  trackFeatureUsage({ feature, action: 'create', metadata });
}

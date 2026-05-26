'use client';

import { useFeature } from '@/hooks/use-feature';
import { trackGateHit } from '@/lib/tracking';
import { useEffect, useRef } from 'react';
import type { FeatureKey } from '@/lib/features';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Optional: render a custom locked state instead of the default */
  fallback?: React.ReactNode;
}

/**
 * Gate component: wraps a feature and shows an upgrade prompt if the user
 * doesn't have access. Currently all features are free, but when you flip
 * a feature to 'premium' in features.ts, this component will automatically
 * show the gate UI.
 *
 * Usage:
 *   <FeatureGate feature="group_trips">
 *     <GroupTripPanel ... />
 *   </FeatureGate>
 */
export function FeatureGate({ feature: featureKey, children, fallback }: FeatureGateProps) {
  const { hasAccess, loading, feature } = useFeature(featureKey);
  const tracked = useRef(false);

  useEffect(() => {
    if (!loading && !hasAccess && !tracked.current) {
      tracked.current = true;
      trackGateHit(featureKey);
    }
  }, [loading, hasAccess, featureKey]);

  if (loading) return null;
  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return <DefaultGate feature={feature} />;
}

function DefaultGate({ feature }: { feature: { name: string; description: string; icon: string } }) {
  return (
    <div className="bg-bg3 border border-gold/20 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-3">{feature.icon}</div>
      <div className="font-[family-name:var(--font-playfair)] text-lg mb-1.5">
        {feature.name}
      </div>
      <p className="text-sm text-text-muted mb-4 max-w-[320px] mx-auto">
        {feature.description}
      </p>
      <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold rounded-xl px-4 py-2 text-sm">
        <span>✨</span>
        <span>Premium Feature</span>
      </div>
      <p className="text-[11px] text-text-muted mt-3">
        Upgrade to Premium to unlock this feature
      </p>
    </div>
  );
}

/**
 * Inline gate: renders nothing if locked, children if unlocked.
 * Use for buttons/links that should just disappear on free tier.
 */
export function FeatureVisible({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const { hasAccess, loading } = useFeature(feature);
  if (loading || !hasAccess) return null;
  return <>{children}</>;
}

/**
 * Premium badge: small indicator next to a feature label
 */
export function PremiumBadge({ feature }: { feature: FeatureKey }) {
  const { isPremiumFeature } = useFeature(feature);
  if (!isPremiumFeature) return null;
  return (
    <span className="inline-flex items-center gap-0.5 bg-gold/15 text-gold text-[10px] px-1.5 py-0.5 rounded-md ml-1.5 uppercase tracking-wider font-medium">
      ✨ Pro
    </span>
  );
}

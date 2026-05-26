'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';

interface ChecklistItem {
  label: string;
  done: boolean;
  action?: string;
  href?: string;
  onClick?: () => void;
}

export function SetupChecklist() {
  const { trips, homebase, visitedCountries, profile } = useStore();
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('stampomad-checklist-dismissed') === '1'
  );

  const realTrips = trips.filter(t => !t.quickPin);

  const items: ChecklistItem[] = [
    {
      label: 'Set up your profile',
      done: !!(profile?.username && profile.username.length >= 3),
      action: 'Complete profile',
    },
    {
      label: 'Set your home base',
      done: !!homebase,
      action: 'Set home base',
    },
    {
      label: 'Pin countries you\'ve visited',
      done: visitedCountries.size > 0,
      action: 'Pin on the map above',
    },
    {
      label: 'Log your first trip',
      done: realTrips.length > 0,
      action: 'Add a trip',
      href: '/trips',
    },
  ];

  const completed = items.filter(i => i.done).length;
  const total = items.length;
  const allDone = completed === total;

  // Don't show if user dismissed it or all done
  if (dismissed || allDone) return null;

  function handleDismiss() {
    localStorage.setItem('stampomad-checklist-dismissed', '1');
    setDismissed(true);
  }

  return (
    <div className="bg-bg3 border border-gold/20 rounded-2xl p-4 sm:p-5 mb-7 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-text-muted hover:text-text text-xs cursor-pointer bg-transparent border-none transition-colors"
        title="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-lg">🚀</div>
        <div>
          <div className="text-sm font-medium">Complete your setup</div>
          <div className="text-[11px] text-text-muted">{completed} of {total} steps done</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/[0.08] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-700"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.label}
            className={`flex items-center gap-3 text-sm ${
              item.done ? 'text-text-muted line-through' : 'text-text'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${
              item.done
                ? 'bg-teal/20 border-teal/40 text-teal'
                : 'border-white/20 text-transparent'
            }`}>
              {item.done ? '✓' : ''}
            </div>
            <span className="flex-1">{item.label}</span>
            {!item.done && item.href && (
              <Link
                href={item.href}
                className="text-[11px] text-gold hover:underline shrink-0"
              >
                {item.action} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

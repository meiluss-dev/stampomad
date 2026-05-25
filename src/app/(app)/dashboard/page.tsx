'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { WorldMap } from '@/components/map/world-map';
import { HomebaseBar } from '@/components/dashboard/homebase-bar';
import { MonthChart, ContinentGrid } from '@/components/dashboard/charts';
import { EnhancedStats } from '@/components/dashboard/enhanced-stats';
import { BadgesPanel } from '@/components/dashboard/badges';
import { CalendarWidget } from '@/components/widgets/calendar-widget';
import { WorldClockWidget } from '@/components/widgets/world-clock-widget';
import { CurrencyWidget } from '@/components/widgets/currency-widget';
import { CountdownWidget } from '@/components/widgets/countdown-widget';

export default function DashboardPage() {
  const { loading, trips, visitedCountries, homebase } = useStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-muted text-lg">Loading your travels...</div>
      </div>
    );
  }

  const realTrips = trips.filter(t => !t.quickPin);
  const headlines = ['The World Awaits', 'Your Journey Begins', 'The Explorer', 'The Wanderer', 'The World Traveler'];
  const isNewUser = realTrips.length === 0 && visitedCountries.size === 0;

  return (
    <div>
      <div className="mb-7">
        <div className="text-xs text-text-muted uppercase tracking-[2px] mb-1.5">Your travel story</div>
        <h1 className="text-[28px] sm:text-[38px]">{headlines[Math.min(Math.floor(realTrips.length / 2), 4)]}</h1>
      </div>

      {isNewUser && (
        <div className="bg-gradient-to-r from-gold/10 via-teal/5 to-gold/10 border border-gold/20 rounded-2xl p-4 sm:p-6 mb-7">
          <h2 className="font-[family-name:var(--font-playfair)] text-lg sm:text-xl mb-2">Welcome aboard! Here&apos;s how to get started:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <div className="text-sm font-medium">Set your home base</div>
                <div className="text-xs text-text-muted mt-0.5">Tell us where you live</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <div className="text-sm font-medium">Right-click the map</div>
                <div className="text-xs text-text-muted mt-0.5">Pin countries you&apos;ve been to</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <div className="text-sm font-medium"><Link href="/trips" className="text-gold hover:underline">Add a trip</Link></div>
                <div className="text-xs text-text-muted mt-0.5">Log your adventures in detail</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <StatsGrid />
      <HomebaseBar />
      <WorldMap />

      <div className="mb-7">
        <BadgesPanel />
      </div>

      {realTrips.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
            <MonthChart />
            <ContinentGrid />
          </div>

          <EnhancedStats />
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-7">
        <CountdownWidget />
        <CalendarWidget />
        <WorldClockWidget />
        <CurrencyWidget />
      </div>
    </div>
  );
}

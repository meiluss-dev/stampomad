import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { GlobeSection } from '@/components/landing/globe-section';
import { RecentTrips } from '@/components/landing/recent-trips';
import { Testimonials } from '@/components/landing/testimonials';
import { WebAppJsonLd } from '@/components/seo/json-ld';

export const revalidate = 3600; // Revalidate every hour (ISR)

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-bg text-text">
      <WebAppJsonLd data={{
        name: 'Stampomad',
        description: 'Free travel tracker app. Log countries visited, map trip routes, write travel journals, and share your adventures. Works offline.',
        url: 'https://www.stampomad.com',
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Web, Android, iOS',
        offers: { price: '0', priceCurrency: 'USD' },
      }} />
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.08] bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="font-[family-name:var(--font-playfair)] text-[22px] text-gold tracking-wide">
          Stampo<span className="text-text font-normal">mad</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="px-5 py-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            Explore
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="px-5 py-2 text-sm text-text-muted hover:text-text transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth"
                className="px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-all"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero with Globe */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 md:pt-24 md:pb-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-xs text-gold mb-8">
                <span>&#10024;</span> Now with Group Trips &mdash; travel together, split the bill
              </div>
              <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">
                Track your travels.
                <br />
                <span className="text-gold">Map every adventure.</span>
              </h1>
              <p className="text-text-muted text-lg md:text-xl max-w-lg mb-10 leading-relaxed mx-auto lg:mx-0">
                Track every country, map every trip, journal your adventures, and travel with friends as you explore the globe.
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link
                  href={isLoggedIn ? '/dashboard' : '/auth'}
                  className="px-8 py-3.5 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
                >
                  {isLoggedIn ? 'Go to Dashboard' : 'Start for free'}
                </Link>
                <a
                  href="#features"
                  className="px-8 py-3.5 border border-white/[0.12] rounded-xl text-base text-text-muted hover:text-text hover:border-white/[0.2] transition-all"
                >
                  See features
                </a>
              </div>
            </div>

            {/* Right: Globe */}
            <GlobeSection />
          </div>
        </div>
        {/* Drag hint */}
        <div className="text-center pb-8 md:pb-12">
          <span className="text-[11px] text-text-muted/60">Drag to spin &middot; Hover to explore</span>
        </div>
      </section>

      {/* Recent published trips */}
      <section className="border-t border-white/[0.06]">
        <RecentTrips />
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-16">
          <div className="text-xs text-text-muted uppercase tracking-[3px] mb-3">Everything you need</div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl">
            Your travel life, <span className="text-gold">all in one place</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: '🗺️',
              title: 'Interactive World Map',
              desc: 'Pin countries you\'ve visited with a right-click. See your progress fill up across continents with a beautiful colour-coded map.',
            },
            {
              icon: '✈️',
              title: 'Trip Logging',
              desc: 'Record every trip with dates, cities, photos, and notes. Sort and filter by continent, year, or search by name.',
            },
            {
              icon: '👥',
              title: 'Group Trips',
              desc: 'Invite friends to join your trips. Split expenses, track shared budgets, and manage a group packing list together.',
            },
            {
              icon: '📔',
              title: 'Travel Journal',
              desc: 'Write journal entries for each trip with rich text. Edit, organise, and relive memories from your adventures.',
            },
            {
              icon: '🤖',
              title: 'AI Trip Summary',
              desc: 'Get a beautifully written AI-generated summary of your trip based on your journal entries. One click to capture the story.',
            },
            {
              icon: '📊',
              title: 'Travel Stats',
              desc: 'See your total countries, continents explored, distance traveled, longest trip, busiest year, and more.',
            },
{
              icon: '🗺️',
              title: 'Route Maps',
              desc: 'Plot your trip routes with waypoints, transport modes, and distance calculations. See your journey come to life on the map.',
            },
            {
              icon: '🌐',
              title: 'AI Language Translator',
              desc: 'Translate the entire app into 12+ languages with one click. Powered by AI for natural, accurate translations.',
            },
            {
              icon: '⏳',
              title: 'Trip Countdown',
              desc: 'A live ticking countdown to your next adventure. See days, hours, minutes, and seconds until departure.',
            },
            {
              icon: '💱',
              title: 'Currency Converter',
              desc: 'Convert between currencies right from your dashboard. Always know the exchange rate wherever you\'re headed.',
            },
            {
              icon: '🕐',
              title: 'World Clock',
              desc: 'Track time zones for your favourite cities. Perfect for staying connected across the globe.',
            },
            {
              icon: '🧳',
              title: 'Packing Lists',
              desc: 'Build custom packing lists for every trip. Check off items as you pack so you never forget a thing.',
            },
            {
              icon: '🌍',
              title: 'Public Profile',
              desc: 'Share your travel map and stats with a public profile page. Post to X, WhatsApp, or Facebook in one tap.',
            },
            {
              icon: '🎨',
              title: 'Three Themes',
              desc: 'Choose between dark, light, and colourful themes. The entire app adapts to your preference.',
            },
            {
              icon: '🔍',
              title: 'Map Search',
              desc: 'Search for any country or city and zoom right to it. Quickly find and pin places you\'ve visited.',
            },
          ].map(f => (
            <div key={f.title} className="bg-bg2 border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="font-medium text-base mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-bg2/50 border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <div className="text-xs text-text-muted uppercase tracking-[3px] mb-3">Simple to start</div>
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl">
              Up and running in <span className="text-gold">3 steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Sign up for free',
                desc: 'Create your account with Google or email. No credit card needed, ever.',
              },
              {
                step: '2',
                title: 'Pin your countries',
                desc: 'Right-click the world map to mark countries you\'ve visited. Set your homebase.',
              },
              {
                step: '3',
                title: 'Log your trips',
                desc: 'Add trip details, photos, journal entries, and route maps. Watch your stats grow.',
              },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center text-gold font-[family-name:var(--font-playfair)] text-xl mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-medium text-base mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-5xl mb-5">
          Ready to stamp <span className="text-gold">your world</span>?
        </h2>
        <p className="text-text-muted text-lg mb-10 max-w-xl mx-auto">
          Join Stampomad and start turning your travels into a beautiful, living record of everywhere you&apos;ve been.
        </p>
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            Back to Dashboard
          </Link>
        ) : (
          <Link
            href="/auth"
            className="inline-block px-10 py-4 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            Get started &mdash; it&apos;s free
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-[family-name:var(--font-playfair)] text-base text-gold mb-3">
                Stampo<span className="text-text font-normal">mad</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Free travel tracker to log countries, map trips, and journal your adventures.
              </p>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Product</div>
              <div className="flex flex-col gap-2">
                <Link href="/explore" className="text-sm text-text-muted hover:text-gold transition-colors">Explore</Link>
                <Link href="/help" className="text-sm text-text-muted hover:text-gold transition-colors">Help Center</Link>
                <Link href="/auth" className="text-sm text-text-muted hover:text-gold transition-colors">Sign Up Free</Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Features</div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-muted">Country Tracker</span>
                <span className="text-sm text-text-muted">Trip Journal</span>
                <span className="text-sm text-text-muted">Route Maps</span>
                <span className="text-sm text-text-muted">Group Trips</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Support</div>
              <div className="flex flex-col gap-2">
                <Link href="/help" className="text-sm text-text-muted hover:text-gold transition-colors">FAQ</Link>
                <Link href="/feedback" className="text-sm text-text-muted hover:text-gold transition-colors">Feedback</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 text-center text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Stampomad. Track your travels, map every adventure.
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // If already logged in, go straight to dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/[0.08] bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="font-[family-name:var(--font-playfair)] text-[22px] text-gold tracking-wide">
          Stampo<span className="text-text font-normal">mad</span>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24 text-center relative">
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-xs text-gold mb-8">
            <span>&#10024;</span> Now in beta &mdash; start mapping your travels today
          </div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-6xl lg:text-7xl leading-tight mb-6">
            Stamp the world.
            <br />
            <span className="text-gold">Log your journey.</span>
          </h1>
          <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Track every country, map every trip, journal your adventures, and earn badges as you explore the globe.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth"
              className="px-8 py-3.5 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
            >
              Start for free
            </Link>
            <a
              href="#features"
              className="px-8 py-3.5 border border-white/[0.12] rounded-xl text-base text-text-muted hover:text-text hover:border-white/[0.2] transition-all"
            >
              See features
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/[0.06] bg-bg2/50">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl text-gold">195</div>
            <div className="text-xs text-text-muted mt-1">Countries to explore</div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl text-teal">25+</div>
            <div className="text-xs text-text-muted mt-1">Badges to earn</div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-playfair)] text-2xl md:text-3xl text-stamp-red">100%</div>
            <div className="text-xs text-text-muted mt-1">Free to use</div>
          </div>
        </div>
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
              icon: '📔',
              title: 'Travel Journal',
              desc: 'Write journal entries for each trip with rich text. Capture memories, stories, and reflections from your adventures.',
            },
            {
              icon: '📊',
              title: 'Travel Stats',
              desc: 'See your total countries, continents explored, distance traveled, longest trip, busiest year, and more.',
            },
            {
              icon: '🏅',
              title: 'Achievement Badges',
              desc: '25 badges across 5 categories. Earn them by exploring new continents, logging trips, writing journals, and hitting milestones.',
            },
            {
              icon: '🗺️',
              title: 'Route Maps',
              desc: 'Plot your trip routes with waypoints, transport modes, and distance calculations. See your journey come to life on the map.',
            },
            {
              icon: '🌍',
              title: 'Public Profile',
              desc: 'Share your travel map and stats with a public profile page. Show the world where you\'ve been.',
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

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">
        <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-5xl mb-5">
          Ready to stamp <span className="text-gold">your world</span>?
        </h2>
        <p className="text-text-muted text-lg mb-10 max-w-xl mx-auto">
          Join Stampomad and start turning your travels into a beautiful, living record of everywhere you&apos;ve been.
        </p>
        <Link
          href="/auth"
          className="inline-block px-10 py-4 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
        >
          Get started &mdash; it&apos;s free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <div className="font-[family-name:var(--font-playfair)] text-base text-gold">
            Stampo<span className="text-text font-normal">mad</span>
          </div>
          <div>&copy; {new Date().getFullYear()} Stampomad. Stamp the world.</div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { GlobeSection } from '@/components/landing/globe-section';
import { RecentTrips } from '@/components/landing/recent-trips';
import { Testimonials } from '@/components/landing/testimonials';
import { StampLogo } from '@/components/stamp-logo';
import { LandingNav } from '@/components/landing/landing-nav';
import { useLang } from '@/components/language-provider';

const FEATURES = [
  { icon: '🗺️', key: 'map' },
  { icon: '✈️', key: 'trips' },
  { icon: '👥', key: 'group' },
  { icon: '📔', key: 'journal' },
  { icon: '🤖', key: 'ai' },
  { icon: '📊', key: 'stats' },
  { icon: '🗺️', key: 'routes' },
  { icon: '🌐', key: 'lang' },
  { icon: '⏳', key: 'countdown' },
  { icon: '💱', key: 'currency' },
  { icon: '🕐', key: 'clock' },
  { icon: '🧳', key: 'packing' },
  { icon: '🌍', key: 'profile' },
  { icon: '🎨', key: 'themes' },
  { icon: '🔍', key: 'search' },
  { icon: '💬', key: 'chat' },
  { icon: '💰', key: 'budget' },
  { icon: '⭐', key: 'reviews' },
  { icon: '📱', key: 'offline' },
  { icon: '🔔', key: 'notifs' },
];

const STEPS = [
  { step: '1', key: 'step1' },
  { step: '2', key: 'step2' },
  { step: '3', key: 'step3' },
];

export function LandingContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useLang();

  return (
    <>
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* Hero with Globe */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-8 md:pt-24 md:pb-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 text-xs text-gold mb-8">
                <span>&#10024;</span> {t('landing_badge')}
              </div>
              <h1 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">
                {t('landing_hero_1')}
                <br />
                <span className="text-gold">{t('landing_hero_2')}</span>
              </h1>
              <p className="text-text-muted text-lg md:text-xl max-w-lg mb-10 leading-relaxed mx-auto lg:mx-0">
                {t('landing_hero_desc')}
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link
                  href={isLoggedIn ? '/dashboard' : '/auth'}
                  className="px-8 py-3.5 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
                >
                  {isLoggedIn ? t('landing_go_dashboard') : t('landing_start_free')}
                </Link>
                <a
                  href="#features"
                  className="px-8 py-3.5 border border-white/[0.12] rounded-xl text-base text-text-muted hover:text-text hover:border-white/[0.2] transition-all"
                >
                  {t('landing_see_features')}
                </a>
              </div>
            </div>
            <GlobeSection />
          </div>
        </div>
        <div className="text-center pb-8 md:pb-12">
          <span className="text-[11px] text-text-muted/60">{t('landing_drag_hint')}</span>
        </div>
      </section>

      {/* Recent published trips */}
      <section className="border-t border-white/[0.06]">
        <RecentTrips />
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-16">
          <div className="text-xs text-text-muted uppercase tracking-[3px] mb-3">{t('landing_features_sub')}</div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl">
            {t('landing_features_title_1')} <span className="text-gold">{t('landing_features_title_2')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.key} className="bg-bg2 border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="font-medium text-base mb-2">{t(`landing_feat_${f.key}`)}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{t(`landing_feat_${f.key}_desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-bg2/50 border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-16">
            <div className="text-xs text-text-muted uppercase tracking-[3px] mb-3">{t('landing_steps_sub')}</div>
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl">
              {t('landing_steps_title_1')} <span className="text-gold">{t('landing_steps_title_2')}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center text-gold font-[family-name:var(--font-playfair)] text-xl mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-medium text-base mb-2">{t(`landing_${s.key}`)}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{t(`landing_${s.key}_desc`)}</p>
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
          {t('landing_cta_title_1')} <span className="text-gold">{t('landing_cta_title_2')}</span>?
        </h2>
        <p className="text-text-muted text-lg mb-10 max-w-xl mx-auto">
          {t('landing_cta_desc')}
        </p>
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            {t('landing_back_dashboard')}
          </Link>
        ) : (
          <Link
            href="/auth"
            className="inline-block px-10 py-4 bg-gold text-bg rounded-xl text-base font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
          >
            {t('landing_cta_btn')}
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-3">
                <StampLogo size="sm" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {t('landing_footer_desc')}
              </p>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">{t('landing_footer_product')}</div>
              <div className="flex flex-col gap-2">
                <Link href="/explore" className="text-sm text-text-muted hover:text-gold transition-colors">{t('landing_explore')}</Link>
                <Link href="/help" className="text-sm text-text-muted hover:text-gold transition-colors">{t('landing_footer_help')}</Link>
                <Link href="/auth" className="text-sm text-text-muted hover:text-gold transition-colors">{t('landing_footer_signup')}</Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">{t('landing_footer_features')}</div>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-text-muted">{t('landing_footer_tracker')}</span>
                <span className="text-sm text-text-muted">{t('landing_footer_journal')}</span>
                <span className="text-sm text-text-muted">{t('landing_footer_routes')}</span>
                <span className="text-sm text-text-muted">{t('landing_footer_group')}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">{t('landing_footer_support')}</div>
              <div className="flex flex-col gap-2">
                <Link href="/help" className="text-sm text-text-muted hover:text-gold transition-colors">{t('landing_footer_faq')}</Link>
                <Link href="/feedback" className="text-sm text-text-muted hover:text-gold transition-colors">{t('landing_footer_feedback')}</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 text-center text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Stampomad. {t('landing_footer_copyright')}
          </div>
        </div>
      </footer>
    </>
  );
}

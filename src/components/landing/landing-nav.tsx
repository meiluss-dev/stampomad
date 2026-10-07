'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StampLogo } from '@/components/stamp-logo';
import { useLang, LanguageModal } from '@/components/language-provider';

export function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, t } = useLang();

  return (
    <>
      <nav className="flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 md:py-5 border-b border-white/[0.08] bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="shrink-0">
          <span className="hidden md:inline"><StampLogo size="md" /></span>
          <span className="md:hidden"><StampLogo size="sm" /></span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setLangOpen(true)}
            className="px-3 py-2 text-sm text-text-muted hover:text-text transition-colors bg-transparent border-none cursor-pointer"
          >
            🌐 {lang.toUpperCase()}
          </button>
          <Link
            href="/explore"
            className="px-5 py-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            {t('landing_explore')}
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              {t('landing_go_dashboard')}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="px-5 py-2 text-sm text-text-muted hover:text-text transition-colors"
              >
                {t('landing_sign_in')}
              </Link>
              <Link
                href="/auth"
                className="px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-all"
              >
                {t('landing_get_started')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: CTA + burger */}
        <div className="flex md:hidden items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-3.5 py-2 bg-gold text-bg rounded-xl text-xs font-medium hover:opacity-90 transition-all"
            >
              {t('landing_dashboard')}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="px-3.5 py-2 bg-gold text-bg rounded-xl text-xs font-medium hover:opacity-90 transition-all"
            >
              {t('landing_get_started')}
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col gap-[5px] p-2 rounded-lg bg-transparent border-none cursor-pointer"
          >
            <span className={`block w-[20px] h-[2px] bg-text rounded transition-all ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-[20px] h-[2px] bg-text rounded transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-[20px] h-[2px] bg-text rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 top-[52px] bg-bg2 z-[49] flex flex-col p-6 gap-2 border-t border-white/[0.08] md:hidden">
          <Link
            href="/explore"
            onClick={() => setMenuOpen(false)}
            className="p-3.5 px-4 rounded-xl text-base font-medium text-text hover:bg-bg3"
          >
            🌍 {t('landing_explore')}
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="p-3.5 px-4 rounded-xl text-base font-medium text-gold hover:bg-bg3"
            >
              📊 {t('landing_dashboard')}
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="p-3.5 px-4 rounded-xl text-base font-medium text-text hover:bg-bg3"
              >
                🔑 {t('landing_sign_in')}
              </Link>
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="p-3.5 px-4 rounded-xl text-base font-medium bg-gold text-bg rounded-xl text-center"
              >
                {t('landing_get_started_free')}
              </Link>
            </>
          )}
          <div className="border-t border-white/[0.08] mt-3 pt-3">
            <div className="text-[11px] text-text-muted uppercase tracking-wider px-4 mb-2">{t('landing_more')}</div>
            <button
              onClick={() => { setMenuOpen(false); setLangOpen(true); }}
              className="p-3.5 px-4 rounded-xl text-base font-medium text-text-muted hover:bg-bg3 w-full text-left bg-transparent border-none cursor-pointer"
            >
              🌐 {t('landing_language')} <span className="text-[13px] text-text-muted ml-1">{lang.toUpperCase()}</span>
            </button>
            <Link
              href="/help"
              onClick={() => setMenuOpen(false)}
              className="p-3.5 px-4 rounded-xl text-base font-medium text-text-muted hover:bg-bg3 block"
            >
              📚 {t('landing_help')}
            </Link>
          </div>
        </div>
      )}

      <LanguageModal open={langOpen} onOpenChange={setLangOpen} />
    </>
  );
}

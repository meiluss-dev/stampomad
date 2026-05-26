'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { ApiKeysModal } from '@/components/settings/api-keys-modal';
import { ProfileModal } from '@/components/settings/profile-modal';
import { ThemeSwitcher } from '@/components/theme-provider';
import { useLang, LanguageModal } from '@/components/language-provider';
import { InviteBadge } from '@/components/group/invite-badge';
import { NotificationBell } from '@/components/notifications/notification-bell';

const tabKeys = [
  { key: 'nav_dashboard', href: '/dashboard', fallback: 'Dashboard' },
  { key: 'nav_trips', href: '/trips', fallback: 'My Trips' },
  { key: 'nav_journal', href: '/journal', fallback: 'Journal' },
  { key: 'nav_stats', href: '/stats', fallback: 'Stats' },
];

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || '';

export function Navbar() {
  const pathname = usePathname();
  const { user, trips, visitedCountries, profile, signOut } = useStore();
  const isAdmin = user?.id === ADMIN_ID;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, t } = useLang();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allCodes = new Set([
    ...visitedCountries,
    ...trips.filter(t => !t.quickPin).map(t => t.code),
  ]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <>
      <nav className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-white/[0.08] bg-bg/97 sticky top-0 z-[100] backdrop-blur-[10px]">
        <div className="font-[family-name:var(--font-playfair)] text-[22px] text-gold tracking-wide">
          Stampo<span className="text-text font-normal">mad</span>
        </div>

        <div className="hidden md:flex gap-1">
          {tabKeys.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-[18px] py-2 rounded-[20px] text-sm transition-all ${
                pathname === tab.href
                  ? 'bg-gold text-bg font-medium'
                  : 'text-text-muted hover:text-text hover:bg-white/[0.04]'
              }`}
            >
              {t(tab.key)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <ThemeSwitcher />
          </div>
          <span className="text-[13px] text-text-muted hidden sm:inline">
            {allCodes.size} {t('countries_explored')}
          </span>

          <NotificationBell />
          <InviteBadge />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-[34px] h-[34px] min-w-[34px] rounded-full bg-gold text-bg flex items-center justify-center text-sm font-semibold overflow-hidden cursor-pointer shrink-0"
            >
              {avatar ? (
                <img src={avatar} alt="" referrerPolicy="no-referrer" className="w-[34px] h-[34px] object-cover block" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] bg-bg2 border border-white/[0.08] rounded-xl p-2 min-w-[200px] z-[200] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="px-3 py-2 text-[13px] font-medium border-b border-white/[0.08] mb-1">
                  <div>{name}</div>
                  <div className="text-[11px] text-text-muted font-normal">{user?.email}</div>
                </div>
                <button
                  onClick={() => { setProfileOpen(true); setDropdownOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] hover:bg-bg3 w-full text-left transition-colors"
                >
                  👤 Public Profile
                </button>
                {profile?.username && (
                  <a
                    href={`/u/${profile.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] text-teal hover:bg-bg3 w-full text-left transition-colors"
                  >
                    🔗 View Public Page
                  </a>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => { setApiKeysOpen(true); setDropdownOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] hover:bg-bg3 w-full text-left transition-colors"
                    >
                      🔑 API Keys
                    </button>
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] hover:bg-bg3 w-full text-left transition-colors"
                    >
                      🛠️ Admin
                    </Link>
                  </>
                )}
                <button
                  onClick={() => { setLangOpen(true); setDropdownOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] hover:bg-bg3 w-full text-left transition-colors"
                >
                  🌐 Language <span className="ml-auto text-[11px] text-text-muted">{lang.toUpperCase()}</span>
                </button>
                <button
                  onClick={async () => { await signOut(); window.location.href = '/auth'; }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] text-stamp-red hover:bg-bg3 w-full text-left transition-colors"
                >
                  → Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex md:hidden flex-col gap-[5px] p-2 rounded-lg bg-transparent border-none cursor-pointer"
          >
            <span className={`block w-[22px] h-[2px] bg-text rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-[22px] h-[2px] bg-text rounded transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-[22px] h-[2px] bg-text rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[56px] sm:top-[60px] bg-bg2 z-[99] flex flex-col p-6 gap-2 border-t border-white/[0.08] md:hidden">
          {tabKeys.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setMobileOpen(false)}
              className={`p-3.5 px-4 rounded-xl text-base font-medium ${
                pathname === tab.href ? 'bg-gold text-bg' : 'text-text hover:bg-bg3'
              }`}
            >
              {t(tab.key)}
            </Link>
          ))}
          <div className="border-t border-white/[0.08] mt-3 pt-4">
            <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2 px-1">Theme</div>
            <ThemeSwitcher />
          </div>
        </div>
      )}

      <ApiKeysModal open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <LanguageModal open={langOpen} onOpenChange={setLangOpen} />
    </>
  );
}

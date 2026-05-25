'use client';

import { StoreProvider } from '@/lib/store';
import { Navbar } from '@/components/navbar';
import { ToastProvider } from '@/components/ui/toast';
import { OnboardingWizard } from '@/components/onboarding/wizard';
import { LangProvider } from '@/components/language-provider';
import type { User } from '@supabase/supabase-js';

export function AppShell({ children, initialUser }: { children: React.ReactNode; initialUser: User }) {
  return (
    <StoreProvider initialUser={initialUser}>
      <LangProvider>
        <ToastProvider>
          <Navbar />
          <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
            {children}
          </main>
          <OnboardingWizard />
        </ToastProvider>
      </LangProvider>
    </StoreProvider>
  );
}

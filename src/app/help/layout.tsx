import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export const metadata = {
  title: 'Help Center — Stampomad',
  description: 'FAQ and help articles for Stampomad. Learn how to track countries, log trips, use offline mode, and more.',
};

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return <AppShell initialUser={user}>{children}</AppShell>;
  }

  return <>{children}</>;
}

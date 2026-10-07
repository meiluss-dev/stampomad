import { createClient } from '@/lib/supabase/server';
import { WebAppJsonLd } from '@/components/seo/json-ld';
import { LandingContent } from '@/components/landing/landing-content';

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
      <LandingContent isLoggedIn={isLoggedIn} />
    </div>
  );
}

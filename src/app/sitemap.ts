import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.stampomad.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Dynamic public profiles
  try {
    const supabase = createAdminClient();
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('username, updated_at')
      .not('username', 'is', null);

    const profilePages: MetadataRoute.Sitemap = (profiles || []).map(p => ({
      url: `${baseUrl}/u/${p.username}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Published trips
    const { data: trips } = await supabase
      .from('trips')
      .select('id, user_id, updated_at')
      .eq('published', true);

    // Map user_ids to usernames
    const userIds = [...new Set((trips || []).map(t => t.user_id))];
    const { data: userProfiles } = userIds.length > 0
      ? await supabase.from('user_profiles').select('user_id, username').in('user_id', userIds)
      : { data: [] };

    const usernameMap = new Map((userProfiles || []).map(p => [p.user_id, p.username]));

    const tripPages: MetadataRoute.Sitemap = (trips || [])
      .filter(t => usernameMap.has(t.user_id))
      .map(t => ({
        url: `${baseUrl}/u/${usernameMap.get(t.user_id)}/trip/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));

    return [...staticPages, ...profilePages, ...tripPages];
  } catch {
    return staticPages;
  }
}

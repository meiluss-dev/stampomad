import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: 'No Unsplash key configured' }, { status: 500 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const { data: trips } = await supabase
    .from('trips')
    .select('id, name, code, cities, cover_url')
    .eq('user_id', userId)
    .eq('quick_pin', false)
    .is('cover_url', null);

  if (!trips?.length) return NextResponse.json({ filled: 0 });

  const { data: photoTrips } = await supabase
    .from('trip_photos')
    .select('trip_id')
    .eq('user_id', userId);

  const tripsWithPhotos = new Set((photoTrips || []).map(p => p.trip_id));
  const needsCover = trips.filter(t => !tripsWithPhotos.has(t.id));

  let filled = 0;
  for (const t of needsCover) {
    const query = t.cities?.split(',')[0]?.trim() || t.name;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' landmark')}&orientation=landscape&per_page=1&client_id=${key}`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const photo = data.results?.[0];
      const coverUrl = photo?.urls?.regular || photo?.urls?.small;
      if (!coverUrl) continue;

      await supabase
        .from('trips')
        .update({ cover_url: coverUrl })
        .eq('id', t.id)
        .eq('user_id', userId);
      filled++;

      // Respect Unsplash rate limit (50/hr free tier)
      await new Promise(r => setTimeout(r, 1200));
    } catch {
      continue;
    }
  }

  return NextResponse.json({ filled, total: needsCover.length });
}

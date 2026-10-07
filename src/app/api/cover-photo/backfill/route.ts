import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchWikipediaImage(query: string): Promise<string | null> {
  const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&pithumbsize=800&format=json&origin=*`;
  try {
    const res = await fetch(directUrl);
    if (res.ok) {
      const data = await res.json();
      for (const page of Object.values(data.query?.pages || {}) as any[]) {
        if (page.thumbnail?.source) return page.thumbnail.source;
      }
    }
  } catch { /* fall through to search */ }

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=pageimages&pithumbsize=800&format=json&origin=*`;
  try {
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    for (const page of Object.values(data.query?.pages || {}) as any[]) {
      if (page.thumbnail?.source) return page.thumbnail.source;
    }
  } catch { /* ignore */ }

  return null;
}

export async function POST(req: NextRequest) {
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
    const city = t.cities?.split(',')[0]?.trim();

    try {
      let coverUrl = await fetchWikipediaImage(city || t.name);
      if (!coverUrl && city) coverUrl = await fetchWikipediaImage(t.name);
      if (!coverUrl) continue;

      await supabase
        .from('trips')
        .update({ cover_url: coverUrl })
        .eq('id', t.id)
        .eq('user_id', userId);
      filled++;
    } catch {
      continue;
    }
  }

  return NextResponse.json({ filled, total: needsCover.length });
}

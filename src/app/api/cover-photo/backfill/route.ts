import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchWikimediaImage(query: string): Promise<string | null> {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*`;

  const res = await fetch(searchUrl);
  if (!res.ok) return null;

  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as any[]) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    const mime = info.extmetadata?.MIMEType?.value || '';
    if (mime && !mime.startsWith('image/')) continue;
    const url = info.thumburl as string;
    if (url.endsWith('.svg') || url.includes('.ogg') || url.includes('.ogv')) continue;
    return url;
  }
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
    const query = t.cities?.split(',')[0]?.trim() || t.name;

    try {
      let coverUrl = await fetchWikimediaImage(`${query} landmark`);
      if (!coverUrl) coverUrl = await fetchWikimediaImage(`${t.name} landmark`);
      if (!coverUrl) continue;

      await supabase
        .from('trips')
        .update({ cover_url: coverUrl })
        .eq('id', t.id)
        .eq('user_id', userId);
      filled++;

      // Small delay to be polite to Wikimedia
      await new Promise(r => setTimeout(r, 500));
    } catch {
      continue;
    }
  }

  return NextResponse.json({ filled, total: needsCover.length });
}

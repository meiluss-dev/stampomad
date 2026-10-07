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
  const { tripId, userId, city, country } = await req.json();
  if (!tripId || !userId) return NextResponse.json({ error: 'Missing tripId or userId' }, { status: 400 });

  try {
    // Try city first, then country
    let coverUrl = await fetchWikimediaImage(`${city || country} landmark`);
    if (!coverUrl && city) coverUrl = await fetchWikimediaImage(`${country} landmark`);
    if (!coverUrl) return NextResponse.json({ coverUrl: null });

    await supabase
      .from('trips')
      .update({ cover_url: coverUrl })
      .eq('id', tripId)
      .eq('user_id', userId);

    return NextResponse.json({ coverUrl });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cover photo' }, { status: 500 });
  }
}

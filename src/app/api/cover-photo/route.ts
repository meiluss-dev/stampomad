import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchWikipediaImage(query: string): Promise<string | null> {
  // Try exact title first
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

  // Fall back to search
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
  const { tripId, userId, city, country } = await req.json();
  if (!tripId || !userId) return NextResponse.json({ error: 'Missing tripId or userId' }, { status: 400 });

  try {
    let coverUrl = await fetchWikipediaImage(city || country || 'travel');
    if (!coverUrl && city) coverUrl = await fetchWikipediaImage(country);
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

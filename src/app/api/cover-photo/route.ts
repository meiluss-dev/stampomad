import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: 'No Unsplash key configured' }, { status: 500 });

  const { tripId, userId, city, country } = await req.json();
  if (!tripId || !userId) return NextResponse.json({ error: 'Missing tripId or userId' }, { status: 400 });

  const query = city || country || 'travel';
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' landmark')}&orientation=landscape&per_page=1&client_id=${key}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: 'Unsplash API error' }, { status: 502 });

    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo) return NextResponse.json({ coverUrl: null });

    const coverUrl = photo.urls?.regular || photo.urls?.small;
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

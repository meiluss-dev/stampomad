import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a travel document parser. You extract trip information from travel documents like boarding passes, flight tickets, hotel bookings, train tickets, bus tickets, and other travel confirmations.

Given one or more images of travel documents, extract the following information and return it as JSON:

{
  "trips": [
    {
      "name": "Trip name (e.g. 'Bangkok Trip' or 'Flight to Rome')",
      "emoji": "relevant emoji for this trip",
      "fromCountry": "ISO 3166-1 alpha-2 code of origin country (e.g. 'GB', 'US')",
      "fromCity": "origin city name",
      "toCountry": "ISO 3166-1 alpha-2 code of destination country",
      "toCity": "destination city name",
      "startDate": "YYYY-MM-DD format",
      "endDate": "YYYY-MM-DD format or null if not found",
      "cities": "comma-separated list of cities mentioned",
      "notes": "any relevant details: airline, flight number, hotel name, booking reference, etc.",
      "confidence": "high/medium/low - how confident you are in the extracted data"
    }
  ]
}

Rules:
- If multiple separate trips/bookings are detected, return multiple items in the array
- If a field cannot be determined, use null
- For country codes, use standard ISO 3166-1 alpha-2 (e.g. US, GB, FR, TH, JP)
- Suggest a fun trip name based on the destination
- Pick an emoji that matches the destination or travel mode
- Include booking references, airline names, hotel names etc in the notes field
- If you see a round-trip, create one trip with both start and end dates
- Return ONLY valid JSON, no markdown fences or extra text`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI features not configured' }, { status: 503 });

  const { images } = await req.json();
  if (!images?.length) return NextResponse.json({ error: 'No images provided' }, { status: 400 });
  if (images.length > 10) return NextResponse.json({ error: 'Maximum 10 images' }, { status: 400 });

  const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];

  for (const img of images) {
    const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) continue;
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: match[1], data: match[2] },
    });
  }

  content.push({ type: 'text', text: 'Parse these travel documents and extract trip information as JSON.' });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[parse-travel-doc] Claude error:', err);
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[parse-travel-doc] Error:', e);
    return NextResponse.json({ error: 'Failed to parse documents' }, { status: 500 });
  }
}

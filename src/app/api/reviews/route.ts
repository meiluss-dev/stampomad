import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET reviews for a trip
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get('tripId');
  if (!tripId) return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trip_reviews')
    .select('id, reviewer_name, rating, comment, created_at, user_id')
    .eq('trip_id', Number(tripId))
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST a new review
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to leave a review' }, { status: 401 });

  const body = await req.json();
  const { tripId, reviewerName, rating, comment } = body;

  if (!tripId || !reviewerName?.trim() || !rating || !comment?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
  }
  if (comment.length > 1000) {
    return NextResponse.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 });
  }

  // Check trip is published
  const { data: trip } = await supabase
    .from('trips')
    .select('id, published')
    .eq('id', Number(tripId))
    .single();

  if (!trip?.published) {
    return NextResponse.json({ error: 'Trip not found or not public' }, { status: 404 });
  }

  // Prevent duplicate reviews (same user, same trip)
  const { data: existing } = await supabase
    .from('trip_reviews')
    .select('id')
    .eq('trip_id', Number(tripId))
    .eq('user_id', user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You already reviewed this trip' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('trip_reviews')
    .insert({
      trip_id: Number(tripId),
      user_id: user.id,
      reviewer_name: reviewerName.trim().slice(0, 100),
      rating: Number(rating),
      comment: comment.trim().slice(0, 1000),
    })
    .select('id, reviewer_name, rating, comment, created_at, user_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE own review
export async function DELETE(req: NextRequest) {
  const reviewId = req.nextUrl.searchParams.get('id');
  if (!reviewId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('trip_reviews')
    .delete()
    .eq('id', Number(reviewId))
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

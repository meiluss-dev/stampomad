import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET approved app reviews (public)
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_reviews')
    .select('id, reviewer_name, rating, comment, countries_visited, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST a new app review (requires auth)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to leave a review' }, { status: 401 });

  const body = await req.json();
  const { reviewerName, rating, comment } = body;

  if (!reviewerName?.trim() || !rating || !comment?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
  }
  if (comment.length > 500) {
    return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
  }

  // Prevent duplicate (one review per user)
  const { data: existing } = await supabase
    .from('app_reviews')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You already submitted a review' }, { status: 409 });
  }

  // Get user's country count for social proof
  const { count } = await supabase
    .from('visited_countries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('app_reviews')
    .insert({
      user_id: user.id,
      reviewer_name: reviewerName.trim().slice(0, 100),
      rating: Number(rating),
      comment: comment.trim().slice(0, 500),
      countries_visited: count || 0,
      approved: true, // auto-approve for now; can add moderation later
    })
    .select('id, reviewer_name, rating, comment, countries_visited, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string | null;
}

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-xl transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${
            star <= (hover || value) ? 'text-gold' : 'text-white/20'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function TripReviews({ tripId, currentUserId }: { tripId: number; currentUserId?: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const alreadyReviewed = currentUserId ? reviews.some(r => r.user_id === currentUserId) : false;

  useEffect(() => {
    fetch(`/api/reviews?tripId=${tripId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReviews(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name');
    if (rating === 0) return setError('Please select a rating');
    if (!comment.trim()) return setError('Please write a comment');

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, reviewerName: name.trim(), rating, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setReviews(prev => [data, ...prev]);
      setName('');
      setRating(0);
      setComment('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reviewId: number) {
    try {
      const res = await fetch(`/api/reviews?id=${reviewId}`, { method: 'DELETE' });
      if (res.ok) setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch {}
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl text-text-muted">Reviews</h2>
        {avgRating && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-gold">★</span>
            <span className="text-gold font-medium">{avgRating}</span>
            <span className="text-text-muted">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Review form */}
      {currentUserId && !alreadyReviewed && (
        <form onSubmit={handleSubmit} className="bg-bg3 border border-white/[0.08] rounded-2xl p-5 mb-6">
          <div className="text-sm font-medium mb-4">Leave a review</div>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                className="w-full bg-bg border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <div className="text-[12px] text-text-muted mb-1.5">Rating</div>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <textarea
                placeholder="What did you think of this trip story?"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full bg-bg border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
              />
              <div className="text-[11px] text-text-muted text-right mt-1">{comment.length}/1000</div>
            </div>
            {error && <div className="text-[12px] text-red-400">{error}</div>}
            {success && <div className="text-[12px] text-teal">Review submitted!</div>}
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {!currentUserId && (
        <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5 mb-6 text-center">
          <p className="text-sm text-text-muted">
            <a href="/auth" className="text-teal hover:underline">Sign in</a> to leave a review
          </p>
        </div>
      )}

      {alreadyReviewed && (
        <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-3 mb-6 text-[13px] text-teal">
          You&apos;ve already reviewed this trip
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="text-center py-8 text-text-muted text-sm">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <div className="text-2xl mb-2">💬</div>
          <p className="text-sm">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="bg-bg3 border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-semibold shrink-0">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{review.reviewer_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating value={review.rating} readonly />
                      <span className="text-[11px] text-text-muted">{timeAgo(review.created_at)}</span>
                    </div>
                  </div>
                </div>
                {currentUserId && review.user_id === currentUserId && (
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="text-[11px] text-text-muted hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm text-text-muted mt-3 leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface AppReview {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  countries_visited: number;
  created_at: string;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-gold text-sm">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= count ? 'text-gold' : 'text-white/15'}>★</span>
      ))}
    </div>
  );
}

export function Testimonials() {
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/app-reviews')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReviews(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || reviews.length === 0) return null;

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <section className="border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <div className="text-xs text-text-muted uppercase tracking-[3px] mb-3">Loved by travelers</div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl">
            What our users <span className="text-gold">say</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Stars count={Math.round(Number(avgRating))} />
            <span className="text-sm text-text-muted">{avgRating} from {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.slice(0, 6).map(review => (
            <div
              key={review.id}
              className="bg-bg2 border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all"
            >
              <Stars count={review.rating} />
              <p className="text-sm text-text-muted mt-4 leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.06]">
                <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-semibold shrink-0">
                  {review.reviewer_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{review.reviewer_name}</div>
                  {review.countries_visited > 0 && (
                    <div className="text-[11px] text-text-muted">
                      🌍 {review.countries_visited} {review.countries_visited === 1 ? 'country' : 'countries'} visited
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

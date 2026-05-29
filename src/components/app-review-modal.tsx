'use client';

import { useState } from 'react';

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-all hover:scale-110 ${
            star <= (hover || value) ? 'text-gold' : 'text-white/20'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function AppReviewModal({ open, onClose, displayName }: { open: boolean; onClose: () => void; displayName: string }) {
  const [name, setName] = useState(displayName);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name');
    if (rating === 0) return setError('Please select a rating');
    if (!comment.trim()) return setError('Please write a comment');

    setSubmitting(true);
    try {
      const res = await fetch('/api/app-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name.trim(), rating, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-bg2 border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text text-lg">✕</button>

        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="font-[family-name:var(--font-playfair)] text-xl mb-2">Thank you!</h3>
            <p className="text-sm text-text-muted">Your review has been submitted and will appear on the homepage.</p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-[family-name:var(--font-playfair)] text-xl mb-1">Rate Stampomad</h3>
            <p className="text-sm text-text-muted mb-5">Your review will be shown on the homepage</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[12px] text-text-muted uppercase tracking-wider mb-1.5 block">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={100}
                  className="w-full bg-bg border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>
              <div>
                <label className="text-[12px] text-text-muted uppercase tracking-wider mb-1.5 block">Rating</label>
                <StarInput value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="text-[12px] text-text-muted uppercase tracking-wider mb-1.5 block">Your review</label>
                <textarea
                  placeholder="What do you love about Stampomad?"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full bg-bg border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
                />
                <div className="text-[11px] text-text-muted text-right mt-1">{comment.length}/500</div>
              </div>
              {error && <div className="text-[12px] text-red-400">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gold text-bg rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

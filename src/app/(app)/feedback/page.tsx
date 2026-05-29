'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', emoji: '🐛' },
  { value: 'feature', label: 'Feature Request', emoji: '💡' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'feedback', label: 'General Feedback', emoji: '💬' },
  { value: 'other', label: 'Other', emoji: '📝' },
];

export default function FeedbackPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const [category, setCategory] = useState('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { toast('Please write a message', 'error'); return; }
    if (!user) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      email: user.email,
      category,
      subject: subject.trim() || null,
      message: message.trim(),
      user_agent: navigator.userAgent,
      page_url: window.location.href,
    });

    if (error) {
      console.error('[Feedback] submit error:', error);
      toast('Failed to send feedback. Please try again.', 'error');
    } else {
      setSubmitted(true);
      toast('Feedback sent! Thank you.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="max-w-[600px] mx-auto py-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl mb-3">Thank you!</h1>
        <p className="text-text-muted mb-6">
          Your feedback has been received. We read every message and it helps make Stampomad better.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSubmitted(false); setSubject(''); setMessage(''); setCategory('feedback'); }}
            className="px-5 py-2.5 rounded-xl bg-bg3 border border-white/[0.08] text-sm hover:border-gold/30 transition-colors cursor-pointer"
          >
            Send another
          </button>
          <Link
            href="/trips"
            className="px-5 py-2.5 rounded-xl bg-gold text-bg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Back to trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="mb-6">
        <div className="text-xs text-text-muted uppercase tracking-[2px] mb-1">We&apos;re listening</div>
        <h1 className="font-[family-name:var(--font-playfair)] text-[28px]">Feedback & Support</h1>
        <p className="text-sm text-text-muted mt-2">
          Found a bug? Have an idea? Just want to say hi? We&apos;d love to hear from you.
          <br />
          Check the <Link href="/help" className="text-teal hover:underline">Help Center</Link> for common questions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category pills */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                  category === cat.value
                    ? 'bg-gold/15 text-gold border-gold/30'
                    : 'bg-bg3 text-text-muted border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">
            Subject <span className="text-text-muted/50">(optional)</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief summary..."
            maxLength={200}
            className="w-full bg-bg3 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind..."
            rows={6}
            required
            className="w-full bg-bg3 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-y min-h-[120px]"
          />
          <div className="text-right text-[11px] text-text-muted mt-1">
            {message.length}/2000
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="w-full py-3 rounded-xl bg-gold text-bg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>
    </div>
  );
}

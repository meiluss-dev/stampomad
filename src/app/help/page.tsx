'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQ {
  q: string;
  a: string;
  category: string;
}

const faqs: FAQ[] = [
  // Getting Started
  {
    category: 'Getting Started',
    q: 'What is Stampomad?',
    a: 'Stampomad is a travel tracking app that helps you log every country, map your trips, journal your adventures, and share your travels with friends. Think of it as your personal travel passport and diary.',
  },
  {
    category: 'Getting Started',
    q: 'How do I log my first trip?',
    a: 'Go to My Trips and click "+ Add Trip". Fill in the country, dates, cities you visited, and any notes. You can also add photos, a travel style, and a rating.',
  },
  {
    category: 'Getting Started',
    q: 'How do I mark countries as visited on the map?',
    a: 'On the Dashboard map, tap and hold (mobile) or right-click (desktop) any country. A menu will appear with options to mark it as visited, add to your wishlist, or remove it.',
  },
  // Features
  {
    category: 'Features',
    q: 'Can I add photos to my trips?',
    a: 'Yes! Each trip card has a photo area at the top. Click/tap the emoji or the camera icon to upload photos. You can add up to 20 photos per trip. Photos auto-rotate in a carousel.',
  },
  {
    category: 'Features',
    q: 'What is the Journal feature?',
    a: 'The Journal lets you write detailed entries for each trip — dates, times, titles, and full text. Perfect for capturing memories, restaurant recommendations, or daily recaps.',
  },
  {
    category: 'Features',
    q: 'How do Route Maps work?',
    a: 'Open a trip and tap "Route" to plot your journey on a map. Add waypoints, choose transport modes (flight, train, car, etc.), and add notes to each stop. You need a Mapbox token in settings to use maps.',
  },
  {
    category: 'Features',
    q: 'Can I share my trips publicly?',
    a: 'Yes! First set up your Public Profile from the user menu. Then on each trip card, click the "Private/Public" toggle. Public trips are visible at stampomad.com/u/yourusername.',
  },
  {
    category: 'Features',
    q: 'How do Group Trips work?',
    a: 'Invite friends to a trip using the "Invite" button on any trip card. They can join, and you can share expenses, packing lists, and collaborate on shared items.',
  },
  {
    category: 'Features',
    q: 'What is the Budget tracker?',
    a: 'Each trip has a Budget button where you can track expenses by category, split costs with group members, and keep track of who owes what.',
  },
  // Offline & Mobile
  {
    category: 'Offline & Mobile',
    q: 'Can I use Stampomad offline?',
    a: 'Yes! Stampomad is a PWA (Progressive Web App). You can download trips for offline access using the "Offline" button on each trip card. This caches your photos, journal entries, route, and map tiles.',
  },
  {
    category: 'Offline & Mobile',
    q: 'How do I install Stampomad on my phone?',
    a: 'On Android: open stampomad.com in Chrome and tap "Add to Home Screen" from the menu or the install banner. On iPhone: open in Safari, tap the Share button, then "Add to Home Screen".',
  },
  {
    category: 'Offline & Mobile',
    q: 'What happens if I write a journal entry offline?',
    a: 'It saves locally and automatically syncs to the cloud when you get back online. You will see an "Offline" indicator in the navbar with a count of pending changes.',
  },
  // Account & Settings
  {
    category: 'Account & Settings',
    q: 'Where do I set up my Mapbox token?',
    a: 'Go to the user menu (your avatar) and click "API Keys". You can get a free Mapbox token at mapbox.com. This is needed for route maps and the interactive world map.',
  },
  {
    category: 'Account & Settings',
    q: 'Is my data private?',
    a: 'By default, all your trips are private. Only trips you explicitly mark as "Public" are visible to others. Your journal entries on public trips are also visible.',
  },
  {
    category: 'Account & Settings',
    q: 'Can I export my data?',
    a: 'Not yet, but this is planned. Your data is stored securely in Supabase and you always have access to it through the app.',
  },
];

const categories = [...new Set(faqs.map(f => f.category))];

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? faqs.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : faqs;

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 sm:px-8 py-4">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <Link href="/" className="font-[family-name:var(--font-playfair)] text-xl text-gold hover:opacity-80 transition-opacity">
            Stampo<span className="text-text font-normal">mad</span>
          </Link>
          <Link href="/auth" className="text-sm text-text-muted hover:text-gold transition-colors">
            Sign in
          </Link>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">📚</div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl text-gold mb-3">
            Help Center
          </h1>
          <p className="text-text-muted max-w-lg mx-auto">
            Everything you need to know about using Stampomad. Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/feedback" className="text-teal hover:underline">Send us feedback</Link>.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg3 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-gold/40"
          />
        </div>

        {/* FAQ sections */}
        {search.trim() ? (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <div className="text-2xl mb-2">🔍</div>
                <p className="text-sm">No results found. Try different keywords or <Link href="/feedback" className="text-teal hover:underline">ask us directly</Link>.</p>
              </div>
            )}
            {filtered.map((faq, i) => (
              <FaqItem key={i} faq={faq} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? null : i)} />
            ))}
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat} className="mb-8">
              <h2 className="text-sm text-gold uppercase tracking-wider mb-3">{cat}</h2>
              <div className="space-y-2">
                {faqs.filter(f => f.category === cat).map((faq, i) => {
                  const globalIdx = faqs.indexOf(faq);
                  return (
                    <FaqItem key={i} faq={faq} open={openIdx === globalIdx} onToggle={() => setOpenIdx(openIdx === globalIdx ? null : globalIdx)} />
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-sm text-text-muted mb-4">Still have questions?</p>
          <Link
            href="/feedback"
            className="inline-block px-6 py-3 rounded-xl bg-gold text-bg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Send Feedback
          </Link>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ faq, open, onToggle }: { faq: FAQ; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left bg-bg3 border border-white/[0.06] rounded-xl px-5 py-4 cursor-pointer hover:border-white/[0.12] transition-colors"
    >
      <div className="flex justify-between items-start gap-3">
        <span className="text-sm font-medium">{faq.q}</span>
        <span className={`text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          &#9662;
        </span>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] text-sm text-text-muted leading-relaxed">
          {faq.a}
        </div>
      )}
    </button>
  );
}

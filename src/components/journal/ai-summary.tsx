'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/countries';
import type { Trip } from '@/types';

export function AISummary({ trip }: { trip: Trip }) {
  const { anthropicKey } = useStore();
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    if (!trip.journal?.length) return;

    const entries = [...trip.journal]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => `[${fmtDate(e.date)}${e.time ? ' ' + e.time : ''}] ${e.title ? e.title + ': ' : ''}${e.text}`)
      .join('\n\n');

    const prompt = `You are a travel writer. Given these journal entries from a trip to ${trip.name} (${trip.code}), write a vivid, cohesive travel narrative summary in 2-3 paragraphs. Capture the highlights, emotions, and atmosphere. Be descriptive but concise.\n\nJournal entries:\n${entries}`;

    setLoading(true);
    setSummary('');
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          messages: [{ role: 'user', content: prompt }],
          ...(anthropicKey ? { apiKey: anthropicKey } : {}),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        setSummary(`Error: ${err}`);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setLoading(false); return; }

      const decoder = new TextDecoder();
      let buf = '';
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              text += parsed.delta.text;
              setSummary(text);
            }
          } catch {}
        }
      }

      if (!text) setSummary('No summary generated.');
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setSummary('Failed to generate summary. Check your API key in settings.');
      }
    } finally {
      setLoading(false);
    }
  }

  function close() {
    abortRef.current?.abort();
    setSummary('');
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={generate}
        disabled={loading}
        className="bg-teal/10 text-teal px-4 py-2 rounded-[20px] font-medium text-sm cursor-pointer hover:bg-teal/20 transition-all disabled:opacity-50"
      >
        {loading ? '✨ Writing...' : '✨ AI Summary'}
      </button>

      {(summary || loading) && (
        <AISummaryPanel summary={summary} loading={loading} onClose={close} />
      )}
    </>
  );
}

export function AISummaryPanel({ summary, loading, onClose }: { summary: string; loading: boolean; onClose: () => void }) {
  return (
    <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 mb-6 col-span-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-teal uppercase tracking-wider font-medium">✨ AI Travel Narrative</span>
        <button onClick={onClose} className="text-text-muted hover:text-text text-sm cursor-pointer">✕</button>
      </div>
      <div className="text-sm leading-[1.8] text-text/85 whitespace-pre-wrap">
        {summary}
        {loading && <span className="inline-block w-1.5 h-4 bg-teal ml-0.5 animate-pulse" />}
      </div>
    </div>
  );
}

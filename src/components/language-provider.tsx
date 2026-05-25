'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UI_STRINGS, PRESET_LANGS } from '@/lib/i18n';
import { useStore } from '@/lib/store';

interface LangContextType {
  lang: string;
  t: (key: string) => string;
  setLang: (code: string) => void;
  translations: Record<string, Record<string, string>>;
  setTranslations: (t: Record<string, Record<string, string>>) => void;
  translating: boolean;
  setTranslating: (b: boolean) => void;
}

const LangContext = createContext<LangContextType | null>(null);

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

const LANG_KEY = 'stampomad_lang';
const TRANS_KEY = 'stampomad_translations';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('en');
  const [translations, setTranslationsState] = useState<Record<string, Record<string, string>>>({});
  const [translating, setTranslating] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang) setLangState(savedLang);
      const savedTrans = localStorage.getItem(TRANS_KEY);
      if (savedTrans) setTranslationsState(JSON.parse(savedTrans));
    } catch {}
  }, []);

  const setLang = useCallback((code: string) => {
    setLangState(code);
    try { localStorage.setItem(LANG_KEY, code); } catch {}
  }, []);

  const setTranslations = useCallback((t: Record<string, Record<string, string>>) => {
    setTranslationsState(t);
    try { localStorage.setItem(TRANS_KEY, JSON.stringify(t)); } catch {}
  }, []);

  const t = useCallback((key: string) => {
    if (lang === 'en') return UI_STRINGS[key] || key;
    return translations[lang]?.[key] || UI_STRINGS[key] || key;
  }, [lang, translations]);

  return (
    <LangContext.Provider value={{ lang, t, setLang, translations, setTranslations, translating, setTranslating }}>
      {children}
    </LangContext.Provider>
  );
}

// ── Language Picker Modal ──

export function LanguageModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { lang, setLang, translations, setTranslations, translating, setTranslating } = useLang();
  const { anthropicKey } = useStore();
  const [customLang, setCustomLang] = useState('');
  const [error, setError] = useState('');

  async function translateTo(code: string) {
    if (code === 'en') {
      setLang('en');
      onOpenChange(false);
      return;
    }

    // Already have cached translation
    if (translations[code]) {
      setLang(code);
      onOpenChange(false);
      return;
    }

    // Need to translate via API
    if (!anthropicKey) {
      setError('Set your Anthropic API key first (🔑 API Keys in the menu)');
      return;
    }

    setTranslating(true);
    setError('');

    const preset = PRESET_LANGS.find(l => l.code === code);
    const langName = preset ? preset.label.replace(/^.\s/, '') : code;

    try {
      const stringsToTranslate = Object.entries(UI_STRINGS)
        .map(([k, v]) => `${k}: ${v}`).join('\n');

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Translate these UI strings for a travel app into ${langName}. Return ONLY a JSON object with the same keys and translated values. No markdown, no explanation, just the JSON. Keep emoji unchanged.\n\n${stringsToTranslate}`
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      const updated = { ...translations, [code]: parsed };
      setTranslations(updated);
      setLang(code);
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Translation failed';
      setError(msg);
    } finally {
      setTranslating(false);
    }
  }

  function handleCustom() {
    if (!customLang.trim()) return;
    const code = customLang.toLowerCase().replace(/\s+/g, '_').slice(0, 10);
    translateTo(code);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !translating && onOpenChange(false)}>
      <div className="bg-bg2 border border-white/[0.08] rounded-2xl w-full max-w-[400px] mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl">Language</h2>
            <button onClick={() => !translating && onOpenChange(false)} className="text-text-muted hover:text-text text-xl cursor-pointer bg-transparent border-none">×</button>
          </div>
          <div className="text-[12px] text-text-muted">✨ AI-powered translation via Claude</div>
        </div>

        <div className="px-5 pb-2">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESET_LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => translateTo(l.code)}
                disabled={translating}
                className={`px-3 py-2.5 rounded-xl text-[13px] text-left cursor-pointer transition-all border ${
                  lang === l.code
                    ? 'bg-gold/10 border-gold/30 text-gold'
                    : 'bg-bg3 border-white/[0.06] text-text hover:border-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {l.label}
                {lang === l.code && <span className="float-right">✓</span>}
                {translations[l.code] && lang !== l.code && <span className="float-right text-text-muted text-[10px]">cached</span>}
              </button>
            ))}
          </div>

          <div className="border-t border-white/[0.08] pt-3 mb-3">
            <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Custom language</div>
            <div className="flex gap-2">
              <input
                value={customLang}
                onChange={e => setCustomLang(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustom()}
                placeholder="e.g. Korean, Hindi..."
                disabled={translating}
                className="flex-1 bg-bg3 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-muted focus:border-gold/30 disabled:opacity-50"
              />
              <button
                onClick={handleCustom}
                disabled={translating || !customLang.trim()}
                className="px-4 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Go
              </button>
            </div>
          </div>

          {translating && (
            <div className="flex items-center gap-2 text-[13px] text-gold bg-gold/5 border border-gold/15 rounded-lg px-3 py-2 mb-3">
              <span className="animate-spin">⏳</span> Translating...
            </div>
          )}

          {error && (
            <div className="text-[12px] text-stamp-red bg-stamp-red/10 border border-stamp-red/20 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 pt-2 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            disabled={translating}
            className="px-4 py-2 rounded-lg border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:border-white/20 transition-colors bg-transparent disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

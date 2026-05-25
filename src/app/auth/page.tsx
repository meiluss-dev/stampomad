'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }
  const supabase = typeof window !== 'undefined' ? getSupabase() : null;

  async function signInWithGoogle() {
    if (!supabase) return;
    const redirectTo = `${window.location.origin}/api/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) setError(error.message);
  }

  async function signInWithEmail() {
    if (!supabase) return;
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/dashboard';
  }

  async function signUpWithEmail() {
    if (!supabase) return;
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) setError(error.message);
    else { setSuccess('Check your email to confirm your account!'); }
  }

  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center">
      <div className="bg-bg2 border border-white/[0.08] rounded-3xl p-6 sm:p-12 w-full max-w-[420px] mx-4 sm:mx-0 text-center">
        <h1 className="font-[family-name:var(--font-playfair)] text-[32px] text-gold mb-2">
          Stampo<span className="text-text font-normal">mad</span>
        </h1>
        <p className="text-sm text-text-muted mb-9">Stamp the world. Log your journey.</p>

        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-2.5 w-full bg-white text-[#333] rounded-xl py-3 text-sm font-medium cursor-pointer hover:bg-gray-100 hover:-translate-y-px transition-all"
        >
          <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5 text-text-muted text-xs">
          <div className="flex-1 h-px bg-white/[0.08]" />
          or
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {error && (
          <div className="bg-stamp-red/10 border border-stamp-red/30 text-stamp-red rounded-lg p-2.5 text-sm mb-3">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-stamp-green/10 border border-stamp-green/30 text-stamp-green rounded-lg p-2.5 text-sm mb-3">
            {success}
          </div>
        )}

        {mode === 'login' ? (
          <div>
            <input
              className="w-full bg-bg3 border border-white/[0.08] rounded-[10px] py-3 px-3.5 text-text text-sm outline-none mb-3 placeholder:text-text-muted focus:border-gold transition-colors"
              type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full bg-bg3 border border-white/[0.08] rounded-[10px] py-3 px-3.5 text-text text-sm outline-none mb-3 placeholder:text-text-muted focus:border-gold transition-colors"
              type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && signInWithEmail()}
            />
            <button onClick={signInWithEmail} className="w-full bg-gold text-bg rounded-xl py-3 text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
              Sign in
            </button>
            <p className="text-sm text-text-muted mt-4">
              Don&apos;t have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }} className="text-gold hover:underline">Sign up</button>
            </p>
          </div>
        ) : (
          <div>
            <input
              className="w-full bg-bg3 border border-white/[0.08] rounded-[10px] py-3 px-3.5 text-text text-sm outline-none mb-3 placeholder:text-text-muted focus:border-gold transition-colors"
              type="text" placeholder="Your name"
              value={name} onChange={e => setName(e.target.value)}
            />
            <input
              className="w-full bg-bg3 border border-white/[0.08] rounded-[10px] py-3 px-3.5 text-text text-sm outline-none mb-3 placeholder:text-text-muted focus:border-gold transition-colors"
              type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full bg-bg3 border border-white/[0.08] rounded-[10px] py-3 px-3.5 text-text text-sm outline-none mb-3 placeholder:text-text-muted focus:border-gold transition-colors"
              type="password" placeholder="Password (min 6 chars)"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && signUpWithEmail()}
            />
            <button onClick={signUpWithEmail} className="w-full bg-gold text-bg rounded-xl py-3 text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
              Create account
            </button>
            <p className="text-sm text-text-muted mt-4">
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }} className="text-gold hover:underline">Sign in</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

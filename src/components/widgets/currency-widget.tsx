'use client';

import { useState, useEffect, useCallback } from 'react';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' }, { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' }, { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' }, { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }, { code: 'NZD', name: 'NZ Dollar', symbol: 'NZ$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' }, { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }, { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' }, { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' }, { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' }, { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
];

export function CurrencyWidget() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('USD');
  const [amount, setAmount] = useState(100);

  useEffect(() => {
    async function fetchRates() {
      try {
        const cached = localStorage.getItem('stampomad_rates');
        if (cached) {
          const { rates: r, ts } = JSON.parse(cached);
          if (Date.now() - ts < 4 * 60 * 60 * 1000) { setRates(r); return; }
        }
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data.rates) {
          data.rates['USD'] = 1;
          setRates(data.rates);
          localStorage.setItem('stampomad_rates', JSON.stringify({ rates: data.rates, ts: Date.now() }));
        }
      } catch {
        setRates({ USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.5, CHF: 0.9, CAD: 1.36, AUD: 1.53, CNY: 7.24, INR: 83.1, BRL: 4.97, MXN: 17.15, KRW: 1325, SGD: 1.34, THB: 35.1, AED: 3.67, TRY: 32.1, ZAR: 18.6, NZD: 1.63 });
      }
    }
    fetchRates();
  }, []);

  const convert = useCallback(() => {
    if (!rates[from] || !rates[to]) return '—';
    const result = (amount / rates[from]) * rates[to];
    return result.toFixed(result < 1 ? 4 : 2);
  }, [rates, from, to, amount]);

  const rate = rates[from] && rates[to] ? ((1 / rates[from]) * rates[to]).toFixed(4) : '—';
  const opts = CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>);

  function swap() { setFrom(to); setTo(from); }

  return (
    <div className="bg-bg3 border border-white/[0.08] rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-xs text-text-muted uppercase tracking-wider">💱 Currency</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-1.5">
          <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-bg4 border border-white/[0.08] rounded-lg py-[7px] px-2.5 text-text text-[13px] outline-none">
            {opts}
          </select>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(+e.target.value)}
            min={0}
            className="w-full bg-bg4 border border-white/[0.08] rounded-lg py-[7px] px-2.5 text-text text-lg font-[family-name:var(--font-playfair)] outline-none"
          />
        </div>
        <button
          onClick={swap}
          className="w-[34px] h-[34px] rounded-lg bg-bg4 border border-white/[0.08] text-text shrink-0 cursor-pointer hover:bg-gold hover:text-bg hover:border-gold hover:rotate-180 transition-all text-base mb-0.5"
        >
          ⇄
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-bg4 border border-white/[0.08] rounded-lg py-[7px] px-2.5 text-text text-[13px] outline-none">
            {opts}
          </select>
          <input
            type="number"
            value={convert()}
            readOnly
            className="w-full bg-teal/5 border border-teal/20 rounded-lg py-[7px] px-2.5 text-teal text-lg font-[family-name:var(--font-playfair)] outline-none"
          />
        </div>
      </div>
      <div className="text-xs text-text-muted mt-2.5 text-center">
        1 {from} = {rate} {to}
      </div>
    </div>
  );
}

'use client';

import { getCountriesByContinent, countryFlag } from '@/lib/countries';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeFlag?: boolean;
}

export function CountrySelect({ value, onChange, placeholder = 'Select country...', includeFlag = false }: CountrySelectProps) {
  const { continents, groups } = getCountriesByContinent();

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-bg3 border border-white/[0.08] rounded-[10px] py-2.5 px-3.5 text-text text-sm outline-none focus:border-gold transition-colors"
    >
      <option value="">{placeholder}</option>
      {continents.filter(c => groups[c].length > 0).map(c => (
        <optgroup key={c} label={c}>
          {groups[c].map(({ code, name }) => {
            const flag = countryFlag(code);
            const val = includeFlag ? `${code}|${c}|${flag}` : `${code}|${c}`;
            return (
              <option key={code} value={val}>
                {flag} {name}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
}

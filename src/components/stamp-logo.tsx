/**
 * Stamp-styled Stampomad logo.
 * Renders the brand name inside a passport-stamp-inspired design.
 */

interface StampLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: {
    wrapper: 'px-2.5 py-1',
    text: 'text-[13px]',
    border: 'border',
    rotate: '-rotate-[3deg]',
    inner: 'px-1.5 py-0.5',
  },
  md: {
    wrapper: 'px-3.5 py-1.5',
    text: 'text-[18px]',
    border: 'border-2',
    rotate: '-rotate-[3deg]',
    inner: 'px-2 py-0.5',
  },
  lg: {
    wrapper: 'px-5 py-2.5',
    text: 'text-[26px]',
    border: 'border-[3px]',
    rotate: '-rotate-[4deg]',
    inner: 'px-3 py-1',
  },
};

export function StampLogo({ size = 'md', className = '' }: StampLogoProps) {
  const s = sizes[size];

  return (
    <span
      className={`inline-block ${s.rotate} ${className}`}
      style={{ filter: 'url(#stamp-rough)' }}
    >
      {/* SVG filter for rough/worn stamp edges */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="stamp-rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <span className={`inline-block ${s.border} border-gold rounded-md ${s.wrapper}`}>
        <span className={`inline-block border border-gold/60 rounded-sm ${s.inner}`}>
          <span className={`font-[family-name:var(--font-playfair)] ${s.text} text-gold uppercase tracking-[3px] leading-none select-none`}>
            Stampo<span className="text-text font-normal">mad</span>
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Circular stamp icon — plane inside a passport stamp circle.
 * Used for favicons, loading states, small brand marks.
 */
export function StampIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.9" />
      {/* Inner circle */}
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 3" />
      {/* Plane icon */}
      <g transform="translate(50, 48) rotate(-30)">
        <path
          d="M-4,-18 L0,-22 L4,-18 L4,-6 L16,2 L16,5 L4,1 L4,10 L8,13 L8,15 L0,12 L-8,15 L-8,13 L-4,10 L-4,1 L-16,5 L-16,2 L-4,-6 Z"
          fill="currentColor"
          opacity="0.85"
        />
      </g>
      {/* Curved text — top */}
      <defs>
        <path id="stamp-text-top" d="M 15,50 a 35,35 0 1,1 70,0" />
        <path id="stamp-text-bottom" d="M 85,50 a 35,35 0 1,1 -70,0" />
      </defs>
      <text fontSize="8" fontWeight="600" letterSpacing="3" fill="currentColor" opacity="0.8">
        <textPath href="#stamp-text-top" startOffset="50%" textAnchor="middle">STAMPOMAD</textPath>
      </text>
      <text fontSize="6.5" fontWeight="400" letterSpacing="2" fill="currentColor" opacity="0.6">
        <textPath href="#stamp-text-bottom" startOffset="50%" textAnchor="middle">TRAVEL TRACKER</textPath>
      </text>
      {/* Small decorative dots */}
      <circle cx="15" cy="50" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="85" cy="50" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

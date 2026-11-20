import React from 'react';

/**
 * The Reading Room brand mark + wordmark.
 * `tone="light"` is for dark backgrounds; `tone="dark"` is for light backgrounds.
 */
export default function BrandLogo({
  tone = 'dark',
  size = 'md',
  compact = false,
  className = '',
}) {
  const light = tone === 'light';
  const small = size === 'sm';

  const markSize = small ? 'h-8 w-8 rounded-[10px]' : 'h-10 w-10 rounded-xl';
  const titleSize = small ? 'text-base' : 'text-lg sm:text-xl';
  const markWrap = light
    ? 'bg-gold/15 text-gold-light ring-1 ring-gold/30'
    : 'bg-burgundy text-white';

  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <span className={`flex shrink-0 items-center justify-center ${markSize} ${markWrap}`}>
        <svg viewBox="0 0 64 64" className={small ? 'h-6 w-6' : 'h-7 w-7'} aria-hidden="true">
          <path
            d="M13 20.5c6.4-2.4 12.4-1.7 19 2.2v24c-6.6-3.9-12.6-4.6-19-2.2v-24Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M51 20.5c-6.4-2.4-12.4-1.7-19 2.2v24c6.6-3.9 12.6-4.6 19-2.2v-24Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M32 22.7v24" fill="none" stroke="#B89B64" strokeWidth="2.6" strokeLinecap="round" />
          <g fill="none" stroke="#D6C39A" strokeWidth="1.8" strokeLinecap="round" opacity=".9">
            <path d="M19 28.5c3.2-.9 6.4-.6 9.2.8" />
            <path d="M19 35c3.2-.9 6.4-.6 9.2.8" />
            <path d="M45 28.5c-3.2-.9-6.4-.6-9.2.8" />
            <path d="M45 35c-3.2-.9-6.4-.6-9.2.8" />
          </g>
          <circle cx="32" cy="14" r="2.2" fill="#B89B64" />
        </svg>
      </span>

      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={`mb-1 text-[8px] font-semibold uppercase tracking-[0.3em] ${light ? 'text-white/50' : 'text-muted'}`}>
            The
          </span>
          <span className={`font-serif font-semibold tracking-tight ${titleSize} ${light ? 'text-white' : 'text-ink'}`}>
            Reading <span className={light ? 'text-gold-light' : 'text-burgundy'}>Room</span>
          </span>
        </span>
      )}
    </span>
  );
}

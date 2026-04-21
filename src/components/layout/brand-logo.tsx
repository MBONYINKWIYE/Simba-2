type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <svg
        viewBox="0 0 72 72"
        aria-hidden="true"
        className="h-12 w-12 shrink-0 drop-shadow-[0_10px_18px_rgba(122,69,22,0.18)]"
      >
        <defs>
          <linearGradient id="lionMane" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7c35f" />
            <stop offset="55%" stopColor="#d98324" />
            <stop offset="100%" stopColor="#8d4b17" />
          </linearGradient>
          <linearGradient id="lionFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff1cf" />
            <stop offset="100%" stopColor="#f4bf74" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="64" height="64" rx="20" fill="#fffaf1" />
        <path
          d="M36 10c8.8 0 16 4.4 20.8 12.4 4.9 8.1 5 17 1.3 24.5-4.5 9-12.5 15.1-22.1 15.1S18.3 55.9 13.8 47c-3.8-7.5-3.5-16.4 1.3-24.5C20 14.4 27.2 10 36 10Z"
          fill="url(#lionMane)"
        />
        <path
          d="M36 19c8.9 0 16.2 6.9 16.2 15.6 0 11.5-7.9 20.2-16.2 20.2s-16.2-8.7-16.2-20.2C19.8 25.9 27.1 19 36 19Z"
          fill="url(#lionFace)"
        />
        <path
          d="M24.5 24.8c-3.8 2.5-6.2 6.8-6.2 11.7 0 9.8 7.2 18.5 17.7 18.5 10.5 0 17.7-8.7 17.7-18.5 0-4.9-2.4-9.2-6.2-11.7 2.3 2.6 3.6 5.9 3.6 9.6 0 8.9-6.3 16.8-15.1 16.8S20.9 43.3 20.9 34.4c0-3.7 1.3-7 3.6-9.6Z"
          fill="#b8631d"
          opacity="0.18"
        />
        <path d="M28 31.5c1.9-1.8 4.2-2.7 8-2.7s6.1.9 8 2.7" fill="none" stroke="#693610" strokeWidth="3" strokeLinecap="round" />
        <circle cx="29.5" cy="35" r="2.2" fill="#3e220d" />
        <circle cx="42.5" cy="35" r="2.2" fill="#3e220d" />
        <path d="M33 42.5 36 39l3 3.5-3 2.2-3-2.2Z" fill="#8f451b" />
        <path d="M29.5 46c1.8 2.4 3.9 3.6 6.5 3.6s4.7-1.2 6.5-3.6" fill="none" stroke="#6f3814" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M19 21.5 12.8 27l1 7.8 7.6-2.6" fill="#d17a23" />
        <path d="M53 21.5 59.2 27l-1 7.8-7.6-2.6" fill="#d17a23" />
      </svg>

      {compact ? null : (
        <div className="min-w-0">
          <p className="text-lg font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white">Simba</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
            Supermarket
          </p>
        </div>
      )}
    </div>
  );
}

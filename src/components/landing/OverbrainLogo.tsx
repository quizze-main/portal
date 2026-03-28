interface OverbrainLogoProps {
  compact?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 32, text: 'text-xl' },
  md: { icon: 38, text: 'text-2xl' },
  lg: { icon: 48, text: 'text-4xl' },
};

const C = '#60a5fa';

function BrainIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
{/* Data cylinder — 2 stacked ellipses */}
      <ellipse cx="24" cy="38" rx="16" ry="4" fill={C} opacity="0.25" />
      <rect x="8" y="31" width="32" height="7" fill={C} opacity="0.15" />
      <ellipse cx="24" cy="31" rx="16" ry="4" fill={C} opacity="0.4" />

      {/* Left hemisphere outline — shifted left by 1.5 for wider gap */}
      <path
        d="M21 3
           C21 3 18.5 2.5 16.5 4
           C14.5 5.5 13.5 7 14 8.5
           C12.5 7.5 10.5 8 9 10
           C7.5 12 7.5 14 8.5 15.5
           C7 16 6.5 17.5 7 19
           C7.5 20.5 8.5 21.5 10 22
           C9.5 23 9.5 24 10.5 25
           C12 26.5 14.5 26 16.5 25
           C18 24.2 19.5 23 21 21.5
           L21 3z"
        stroke={C}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Left inner folds */}
      <path d="M18.5 5.5 C16.5 7 16 9 17 10.5" stroke={C} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M13.5 9 C12.5 11 13 13 14.5 14" stroke={C} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M9.5 16 C10 18 11.5 19.5 13.5 19.5" stroke={C} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M12 22 C13.5 23 16 22.5 17.5 21" stroke={C} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M16.5 12 C15 14 15.5 16.5 17.5 17.5" stroke={C} strokeWidth="1" strokeLinecap="round" fill="none" />

      {/* Right hemisphere outline — shifted right by 1.5 for wider gap */}
      <path
        d="M27 3
           C27 3 29.5 2.5 31.5 4
           C33.5 5.5 34.5 7 34 8.5
           C35.5 7.5 37.5 8 39 10
           C40.5 12 40.5 14 39.5 15.5
           C41 16 41.5 17.5 41 19
           C40.5 20.5 39.5 21.5 38 22
           C38.5 23 38.5 24 37.5 25
           C36 26.5 33.5 26 31.5 25
           C30 24.2 28.5 23 27 21.5
           L27 3z"
        stroke={C}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right inner folds */}
      <path d="M29.5 5.5 C31.5 7 32 9 31 10.5" stroke={C} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M34.5 9 C35.5 11 35 13 33.5 14" stroke={C} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M38.5 16 C38 18 36.5 19.5 34.5 19.5" stroke={C} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M36 22 C34.5 23 32 22.5 30.5 21" stroke={C} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M31.5 12 C33 14 32.5 16.5 30.5 17.5" stroke={C} strokeWidth="1" strokeLinecap="round" fill="none" />

      {/* Center vertical line */}
      <line x1="24" y1="2.5" x2="24" y2="22" stroke={C} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function OverbrainLogo({ compact = false, className = '', size = 'md' }: OverbrainLogoProps) {
  const s = sizes[size];

  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <BrainIcon size={s.icon} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-[3px] ${className}`}>
      <BrainIcon size={s.icon} />
      <span className={`${s.text} font-light tracking-tight leading-none`}>
        <span className="text-gray-700 dark:text-gray-300">Over</span>
        <span className="font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          Brain
        </span>
      </span>
    </div>
  );
}

/**
 * XplorDataOps logo mark — inline SVG, no external image file needed.
 *
 * Transparent background throughout.
 * X strokes: inherit `currentColor` so Tailwind text-color utilities control
 *   the shade — dark charcoal in light mode, white in dark mode.
 * Purple dot: hardcoded to brand purple (#6B21E8), always vibrant.
 */
export default function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-brand-charcoal dark:text-white ${className ?? ''}`}
      aria-hidden="true"
    >
      {/* X — two bold crossing diagonals with rounded caps */}
      <line
        x1="14" y1="14" x2="86" y2="86"
        strokeWidth="18"
        strokeLinecap="round"
        stroke="currentColor"
      />
      <line
        x1="86" y1="14" x2="14" y2="86"
        strokeWidth="18"
        strokeLinecap="round"
        stroke="currentColor"
      />
      {/* Signature dot — top-left, always brand purple */}
      <circle cx="21" cy="21" r="16" fill="#6B21E8" />
    </svg>
  );
}

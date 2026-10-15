// MO1B-013 row 3 (OURS): Lucide dropped its brand icons, so Instagram is our
// own line glyph on a 17 box: a 14 × 14 rounded square (r4), a r3.5 circle
// and a r0.8 dot, 1.75 stroke (the sub-page row glyph weight), currentColor.
export function InstagramGlyph({ size = 17, strokeWidth = 1.75, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="14" height="14" rx="4" />
      <circle cx="8.5" cy="8.5" r="3.5" />
      <circle cx="12.6" cy="4.4" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

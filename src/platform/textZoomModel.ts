// The arithmetic of the iPhone's Dynamic Type percent (textZoom.ts), kept free of
// Capacitor so it can be tested.

/** Larger text's step, as a scale (its +2px on the common 12–14px sizes). */
export const LARGER_TEXT_SCALE = 1.2;

/** The percent to apply: the phone's, within `max` (less Larger text's share when it is on). */
export function appliedTextZoom(percent: number, max: number, largerText: boolean): number {
  if (!Number.isFinite(percent) || percent <= 0) return 100;
  const top = Number.isFinite(max) && max >= 100 ? max : 200;
  const cap = largerText ? Math.floor(top / LARGER_TEXT_SCALE) : top;
  return Math.round(Math.max(50, Math.min(percent, cap)));
}

/** What goes on <html>: the class and the two variables (null: removed). */
export function textZoomStyle(applied: number): { on: boolean; zoom: string | null; fieldMin: string | null } {
  if (applied === 100) return { on: false, zoom: null, fieldMin: null };
  return {
    on: true,
    zoom: `${applied}%`,
    // Below 100%, a field's own size is raised so that, scaled, it is still 16px.
    fieldMin: applied < 100 ? `${Math.ceil((1600 / applied) * 100) / 100}px` : null,
  };
}

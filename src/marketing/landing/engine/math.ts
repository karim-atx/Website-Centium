// Centium landing v29: the prototype's progress maths, ported literally from
// handover 08_prototype-source/Centium Site v29.dc.html (clamp, sm, eo, swing,
// prog) so every scroll and loading state is the same pure function of
// progress as the reference.

/** Clamp to 0..1. */
export const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Smoothstep of v between a and b, clamped (prototype `sm`). */
export const sm = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Ease-out cubic (prototype `eo`). */
export const eo = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Ease-in-out cubic, written inline in the prototype as
 *  `d < 0.5 ? 4d^3 : 1 - (-2d + 2)^3 / 2`. */
export const easeInOut3 = (d: number): number => (d < 0.5 ? 4 * d * d * d : 1 - Math.pow(-2 * d + 2, 3) / 2);

/** A pinned track: its document top and the scroll span it pins for. */
export interface Track {
  el: HTMLElement;
  t: number;
  span: number;
}

/** Progress through a pinned track (prototype `prog`). */
export const prog = (tr: Track | null | undefined, y: number): number => (!tr ? 0 : clamp((y - tr.t) / tr.span));

export interface Swing {
  x: number;
  desc: number;
  lift: number;
  rot: number;
  sx: number;
  fl: number;
}

/** The falling leaf's pendulum (prototype `swing`): N swings of amplitude A
 *  narrowing to 0 as u goes 0..1, with one flip around u 0.42..0.62. */
export const swing = (u: number, N: number, A: number): Swing => {
  const s = N * u,
    env = Math.pow(1 - u, 0.55),
    c = Math.cos(Math.PI * s),
    fl = sm(0.42, 0.62, u);
  return {
    x: -A * env * c,
    desc: (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI)) / N,
    lift: 0.1 * A * env * c * c,
    rot: -30 * c * Math.pow(env, 0.35),
    sx: Math.cos(2 * Math.PI * fl),
    fl,
  };
};

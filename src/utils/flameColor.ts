// V7 (QA 7.0): streak flame icons shift from a cool gold to a hot
// red-orange as the streak gets closer to its goal — kept as explicit hex
// stops (not the "ember" brand token, which the QA5 rebrand remapped to
// sage) so it still actually reads as a flame.
const GOLD: [number, number, number] = [242, 197, 114];
const HOT: [number, number, number] = [226, 74, 58];

export function flameColor(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  const r = Math.round(GOLD[0] + (HOT[0] - GOLD[0]) * p);
  const g = Math.round(GOLD[1] + (HOT[1] - GOLD[1]) * p);
  const b = Math.round(GOLD[2] + (HOT[2] - GOLD[2]) * p);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Makes `food` the match for the voice row at `index`, and ticks it.
 *
 * ONE WAY FOR A NEW FOOD TO JOIN A RECORDING, whichever way the member made
 * it: typed in Create food, or found with Search online and saved as their
 * own food (batch B · FO). The row stops being "new food" and becomes an
 * ordinary matched row, priced in the preview and counted by the Add button.
 *
 * WHAT WAS SAID IS KEPT. The spoken name, quantity and unit are untouched:
 * only the food they apply to changes, and the review's preview rescales
 * them through servingMultiplier against the new food's serving, exactly as
 * when one of the "Also:" alternatives is chosen. Every other row is returned
 * as it was (the same objects), and an index out of range changes nothing.
 *
 * Generic over the food so this file imports nothing: the node:test project
 * has no DOM, and the review's own types sit beside the recorder.
 */
export function matchVoiceRow<F, T extends { food: F | null; selected: boolean }>(
  items: readonly T[],
  index: number,
  food: F
): T[] {
  return items.map((it, i) => (i === index ? { ...it, food, selected: true } : it));
}

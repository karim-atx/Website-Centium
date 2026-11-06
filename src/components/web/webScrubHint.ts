import { t, tk } from "../../i18n/core";

// Professional handover v1, 7.3: the charts' scrub hints in their web wording (click, not tap).

/** Scrub hints the charts receive already translated, with their web wording. */
const SCRUB_WEB: [string, string][] = [
  [tk("Drag sideways to scrub, tap to pin"), tk("Drag sideways to scrub, click to pin")],
  [tk("Drag sideways to scrub, tap a point to pin it"), tk("Drag sideways to scrub, click a point to pin it")],
  [tk("Drag sideways to scrub, tap a week to pin it"), tk("Drag sideways to scrub, click a week to pin it")],
];

/** A translated scrub hint in its web wording (unknown hints pass through). */
export function webScrubHint(hint: string): string {
  const hit = SCRUB_WEB.find(([m]) => t(m) === hint);
  return hit ? t(hit[1]) : hint;
}

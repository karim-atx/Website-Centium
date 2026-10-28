import { CalendarClock, ClipboardCheck, ClipboardList, Send, Share2, UserPlus, type LucideIcon } from "lucide-react";
import { INK } from "../pro/proInk";
import type { ReminderTone } from "../../services/client-forms/logic";

// Release 3 · W7 the reminder card's colour sets and icon, from the board
// (source/gen/r21.js tone21 / remIcon21): lavender (check-ins, referrals),
// teal (sessions), gold (intake forms). Tile: white in light, the ink at 16%
// in dark.

export interface ToneSet {
  bg: string;
  ink: string;
  tile: string;
}

export function toneSet(tone: ReminderTone, dark: boolean): ToneSet {
  if (tone === "teal") return { bg: INK.tealPale, ink: "rgb(var(--c-team-teal-ink))", tile: dark ? "rgba(147,193,185,0.16)" : "#FFFFFF" };
  if (tone === "gold") return { bg: INK.goldPale, ink: INK.goldInk, tile: dark ? "rgba(220,187,127,0.16)" : "#FFFFFF" };
  return { bg: INK.prPale, ink: INK.prDeep, tile: dark ? "rgba(195,179,251,0.16)" : "#FFFFFF" };
}

/** The ink on a filled reminder button: white, or #121317 in dark (r21 remCard21). */
export const onTone = (dark: boolean) => (dark ? "#121317" : "#FFFFFF");

export function iconFor(kind: string): LucideIcon {
  if (kind === "session") return CalendarClock;
  if (kind === "referral") return Send;
  // Release A: the client connects after a referral was accepted (user-plus).
  if (kind === "referral_connect") return UserPlus;
  if (kind === "intake") return ClipboardList;
  // Release 3 · W8 CU29: a professional asks to share a win (remIcon21 'share-2').
  if (kind === "share_request") return Share2;
  return ClipboardCheck;
}

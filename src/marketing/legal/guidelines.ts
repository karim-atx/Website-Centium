// The Community guidelines (Round C Release 2): Karim's draft
// (design-handover/round-c/GUIDELINES_DRAFT.md) word for word, for him to edit
// later. Every moderation and image-approval message links here.
//
// A line is a list of pieces; a piece in `b` is bold, as the draft marks it.
// Round F (AV): the Arabic is guidelines.ar.ts, the same shape; the page
// takes the text for the language with guidelinesFor().

import { documentFor } from "../../i18n/core";
import { legalDate } from "../../pages/settings/legalCopy";
import type * as ArabicGuidelines from "./guidelines.ar";

export type GuidelinePiece = string | { b: string };

export const GUIDELINES_PATH = "/legal/community-guidelines";
export const GUIDELINES_UPDATED = "October 29, 2026";

export const GUIDELINES_INTRO =
  "Centium is a place to look after your health with people who want the same. These guidelines apply to everything others can see: forum posts and replies, reviews, profiles, offers, showcases and photos.";

export const GUIDELINE_SECTIONS: { id: string; h: string; items: GuidelinePiece[][]; after?: GuidelinePiece[] }[] = [
  {
    id: "be-kind",
    h: "Be kind",
    items: [
      ["Disagree with ideas, not people. No insults, threats, harassment or hate based on who someone is."],
      ["Don't pile on. If a conversation turns heated, step away or report it."],
    ],
  },
  {
    id: "keep-it-safe",
    h: "Keep it safe",
    items: [
      ["Share experience, not medical orders. Don't tell anyone to stop a treatment or medicine, and don't promote extreme diets, purging or dangerous challenges."],
      ["If you're struggling or thinking about hurting yourself, you're not alone. Use ", { b: "Get support" }, " to reach someone now. Posting about it never counts against you."],
      ["Nothing sexual, violent or graphic."],
    ],
  },
  {
    id: "keep-it-private",
    h: "Keep it private",
    items: [
      ["Don't share anyone's personal details, photos or health information without their permission. That includes your own phone number, email and address in public places: use messages to share contact details with someone."],
      ["In the forum, your nickname keeps you private. Don't try to find out who is behind someone else's."],
    ],
  },
  {
    id: "keep-it-honest",
    h: "Keep it honest",
    items: [
      ["Be yourself. Don't pretend to be someone else, a professional you aren't, or Centium."],
      ["Reviews are for real experiences. Don't review yourself, a competitor, or a place you haven't been."],
      ["No spam, scams or links to unrelated sites. Promoting your business belongs in offers and your profile, not in the forum."],
    ],
  },
  {
    id: "photos",
    h: "Photos",
    items: [
      ["Every photo others can see is checked by our team before it appears, usually within a day. Until then, only you can see it."],
      ["Use photos you took or have the right to use. No photos of other people without their permission, and no photos of children other than your own."],
    ],
  },
  {
    id: "what-happens",
    h: "What happens when something breaks these guidelines",
    items: [
      [{ b: "Blocked:" }, " some words and contact details can't be posted. You'll be told when you save, and your text is kept so you can edit it."],
      [{ b: "Held for review:" }, " a post may wait for a moderator before others can see it. You can still see it."],
      [{ b: "Removed:" }, " a moderator can remove a post, review or photo. You'll get a notice with the reason."],
      [{ b: "Paused:" }, " repeated or serious breaks can pause your access to the forum, or to Centium."],
    ],
    after: ["If you think we got something wrong, contact us from ", { b: "Settings › Contact us" }, "."],
  },
  {
    id: "reporting",
    h: "Reporting",
    items: [],
    after: [
      "Use ",
      { b: "Report" },
      " on any post, review, message or profile. Reports are anonymous to the person you report. If someone may be at risk, choose that reason so a moderator sees it first.",
    ],
  },
];

/** The intro and sections in the active language (call during render). */
export function guidelinesFor(): { intro: string; sections: typeof GUIDELINE_SECTIONS } {
  const AR = documentFor<typeof ArabicGuidelines>("legal.guidelines");
  return AR
    ? { intro: AR.GUIDELINES_INTRO, sections: AR.GUIDELINE_SECTIONS }
    : { intro: GUIDELINES_INTRO, sections: GUIDELINE_SECTIONS };
}

/** GUIDELINES_UPDATED in the active language (as is in English). */
export const guidelinesUpdated = (): string => legalDate(GUIDELINES_UPDATED);

// Round F (AV, F11): IBM Plex Sans Arabic, from Google Fonts like Manrope,
// added only once Arabic is chosen, so English pages load nothing new. Every
// font stack lists it after Manrope, which has no Arabic letters, so the
// browser takes Arabic from it and everything else from Manrope.
const HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";

const HAS_ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
// Google serves the face in subsets by unicode-range; a sample of Arabic
// letters is what makes document.fonts.load fetch the Arabic one.
const ARABIC_SAMPLE = "أبجد";

/** Adds the stylesheet once; resolves when it has loaded (or failed, or after 3 s). */
export function ensureArabicFont(doc: Document = document): Promise<void> {
  let el = doc.head.querySelector<HTMLLinkElement>(`link[href="${HREF}"]`);
  if (!el) {
    el = doc.createElement("link");
    el.rel = "stylesheet";
    el.href = HREF;
    doc.head.appendChild(el);
  }
  if (el.sheet) return Promise.resolve();
  const link = el;
  return new Promise((resolve) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
    setTimeout(resolve, 3000);
  });
}

export const hasArabic = (text: string) => HAS_ARABIC.test(text);

/**
 * Before drawing on a canvas. A canvas draws with whatever face is loaded at
 * that moment and never swaps later, so when the text has Arabic, this adds
 * the stylesheet and loads the Arabic face for every font given (stacks that
 * list IBM Plex Sans Arabic). Text with no Arabic does nothing, so English
 * images load nothing new.
 */
export async function loadArabicForCanvas(fonts: Iterable<string>, text: string): Promise<void> {
  if (!hasArabic(text)) return;
  await ensureArabicFont();
  await Promise.all([...fonts].map((f) => document.fonts.load(f, ARABIC_SAMPLE).catch(() => [])));
}

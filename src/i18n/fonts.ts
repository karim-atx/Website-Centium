// Round F (AV, F11): IBM Plex Sans Arabic, from Google Fonts like Manrope,
// added only once Arabic is chosen, so English pages load nothing new. Every
// font stack lists it after Manrope, which has no Arabic letters, so the
// browser takes Arabic from it and everything else from Manrope.
const HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";

export function ensureArabicFont(doc: Document = document) {
  if (doc.head.querySelector(`link[href="${HREF}"]`)) return;
  const el = doc.createElement("link");
  el.rel = "stylesheet";
  el.href = HREF;
  doc.head.appendChild(el);
}

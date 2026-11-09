// R21 / D15 Larger text: every px or rem font-size becomes
// min(calc(X + var(--text-boost, 0px)), max(X, 34px)), exactly X while
// --text-boost is 0 (Larger text off) and X + 2px with the setting on, never
// above 34px unless X already was (Foundations 2.7 "Every type style +2 pt
// (max 34 pt)"). px or rem line heights grow by the same 2px so lines keep
// their spacing; unitless line heights scale on their own. --text-boost is set
// on html.larger-text (index.css). Inline sizes use src/theme/textSize.ts.
//
// Form fields on phones: the whole size is wrapped in
// max(var(--field-min, 0px), …). --field-min is 16px only on form fields
// below 768px (index.css), so a field's text is never under 16px there and
// iOS doesn't zoom the page when one is focused. Everywhere else it is unset,
// the max() picks the size itself, and nothing changes. Larger fields keep
// their own size.
const SIZE = /^-?[\d.]+(px|rem)$/;

export default function largerText() {
  return {
    postcssPlugin: "centium-larger-text",
    Declaration(decl) {
      if (decl.value.includes("--text-boost")) return;
      const v = decl.value.trim();
      if (decl.prop === "font-size" && SIZE.test(v)) {
        decl.value = `max(var(--field-min, 0px), min(calc(${v} + var(--text-boost, 0px)), max(${v}, 34px)))`;
      } else if (decl.prop === "line-height" && SIZE.test(v)) {
        decl.value = `calc(${v} + var(--text-boost, 0px))`;
      }
    },
  };
}
largerText.postcss = true;

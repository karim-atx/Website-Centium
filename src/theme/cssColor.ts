// R20 (batch D): theme colours are CSS variables (rgb(var(--th-6f9993))),
// which canvas fillStyle cannot read. This swaps each var() for its value on
// the root element at draw time, so a canvas follows the theme too.
export function resolveCssColor(colour: string): string {
  if (!colour.includes("var(") || typeof document === "undefined") return colour;
  const root = getComputedStyle(document.documentElement);
  return colour.replace(/var\((--[\w-]+)\)/g, (_, name: string) => root.getPropertyValue(name).trim());
}


// Handover "Tio + Centium Fixes", B · RULE B3: a popup shows Tio only if its
// MOBILE sheet renders at 668 px or less (the Add Food sheet at 430 wide).
//
// - Mobile: the rendered panel is measured on every open, and the result is
//   kept for the popup's website twin.
// - Website: the mobile result for that popup when there is one; otherwise
//   (always the case for a desktop-only session) the popup's own content is
//   laid out offscreen at 430 wide inside the mobile sheet chrome and the same
//   rule applied (README ANSWERS 8). Cached per popup id for the session; never
//   "not eligible" by default.

const cache = new Map<string, boolean>();

export function rememberTioEligibility(id: string | undefined, eligible: boolean): void {
  if (id) cache.set(id, eligible);
}

export function cachedTioEligibility(id: string | undefined): boolean | undefined {
  return id ? cache.get(id) : undefined;
}

/** Tests: a fresh session. */
export function clearTioEligibility(): void {
  cache.clear();
}

/** The mobile sheet chrome around the content, as BottomSheet draws it below 1024 (no safe area on a desktop). */
export interface MobileChrome {
  hideHeader?: boolean;
  handle?: boolean;
  headerHeight: number;
  borderWidth: number;
  /** Body padding (px): top, right, bottom, left. */
  body: [number, number, number, number];
  /** Footer padding (px), when there is a footer: top, right, bottom, left; and its 1px rule. */
  footer?: { pad: [number, number, number, number]; rule: boolean };
}

/**
 * The height the mobile sheet would render at: the chrome plus a copy of the
 * content (body and footer) laid out 430 wide, offscreen and hidden. A DOM
 * copy, so nothing in it runs (no effects, no requests); ids are dropped so
 * nothing is duplicated while it exists. Removed at once.
 *
 * A region the phone caps and the website lets grow (Add Food's list: 424 on
 * the phone) declares its mobile cap as `data-mobile-max-height`, and the
 * copy takes it, so the copy reads as the phone's sheet does.
 */
export function measureMobileSheet(content: HTMLElement | null, footer: HTMLElement | null, chrome: MobileChrome): number {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("data-tio-measure", "");
  Object.assign(host.style, { position: "fixed", left: "-10000px", top: "0", width: "430px", visibility: "hidden", pointerEvents: "none" });
  const panel = document.createElement("div");
  Object.assign(panel.style, {
    boxSizing: "border-box",
    width: "430px",
    display: "flex",
    flexDirection: "column",
    ...(chrome.hideHeader ? null : { borderStyle: "solid", borderWidth: `${chrome.borderWidth}px ${chrome.borderWidth}px 0` }),
  });
  if (!chrome.hideHeader) {
    const head = document.createElement("div");
    head.style.flexShrink = "0";
    head.style.height = `${(chrome.handle ? 12 : 0) + chrome.headerHeight}px`;
    panel.appendChild(head);
  }
  const box = (pad: [number, number, number, number], from: HTMLElement | null, rule = false) => {
    const el = document.createElement("div");
    el.style.boxSizing = "border-box";
    el.style.padding = pad.map((p) => `${p}px`).join(" ");
    if (rule) el.style.borderTop = "1px solid transparent";
    if (from) for (const n of Array.from(from.childNodes)) el.appendChild(n.cloneNode(true));
    for (const withId of Array.from(el.querySelectorAll("[id]"))) withId.removeAttribute("id");
    for (const capped of Array.from(el.querySelectorAll<HTMLElement>("[data-mobile-max-height]"))) {
      capped.style.maxHeight = `${capped.dataset.mobileMaxHeight}px`;
      capped.style.overflowY = "hidden";
    }
    panel.appendChild(el);
  };
  box(chrome.body, content);
  if (chrome.footer) box(chrome.footer.pad, footer, chrome.footer.rule);
  host.appendChild(panel);
  document.body.appendChild(host);
  const h = panel.getBoundingClientRect().height;
  host.remove();
  return h;
}

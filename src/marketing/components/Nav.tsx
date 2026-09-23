import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { CentiumMark, CentiumWordmarkCropped } from "./CentiumLogo";
import { useNavTheme } from "../hooks/useNavTheme";
import { useNavHeroGlass } from "../hooks/useNavHeroGlass";
import { useNavScrollSpy } from "../hooks/useNavScrollSpy";

// Fired on `window` whenever a nav-triggered long jump (see scrollToSection
// below) starts/stops, so the hero canvas (useHeroFlow.ts, owned separately)
// can idle for the duration per the handoff's "Hero flow canvas" section
// ("idles when ... a nav jump is travelling"). No existing pub/sub
// convention for this in the codebase, so a plain CustomEvent is the
// smallest contract — flagged in the handoff report for the hero-canvas
// owner to pick up (or ignore) on their side.
export const NAV_JUMP_EVENT = "centium:nav-scroll-jump";

const NAV_OFFSET = 88;

/** Handoff's `scrollToOffset()`: short hops use the browser's native smooth
 *  scroll (already handled correctly by MarketingLayout's hash effect for
 *  every Link here — untouched, out of this file's scope), but a jump
 *  further than 1.2 viewport heights away is driven frame-by-frame with a
 *  fixed, distance-clamped duration instead, because native smooth-scroll
 *  duration grows with distance and crawls on long jumps. Returns true if it
 *  took over (caller should preventDefault); false leaves the click to the
 *  default Link/route-hash handling. */
function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const measureTop = () => el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  const from = window.scrollY;
  const target = measureTop();
  if (Math.abs(target - from) <= window.innerHeight * 1.2) return false;

  window.dispatchEvent(new CustomEvent(NAV_JUMP_EVENT, { detail: { active: true } }));
  const dist = Math.abs(target - from);
  const dur = Math.min(900, Math.max(420, 360 + dist * 0.055));
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const t0 = performance.now();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.dispatchEvent(new CustomEvent(NAV_JUMP_EVENT, { detail: { active: false } }));
    (["wheel", "touchstart", "keydown"] as const).forEach((ev) => window.removeEventListener(ev, finish));
    // Keep the URL in sync without re-triggering MarketingLayout's own hash
    // scroll (it would just be a harmless no-op at this point, but a plain
    // history update is simpler than reasoning about a second smooth-scroll
    // racing this one to the same target).
    window.history.replaceState(null, "", `/#${id}`);
  };
  const step = (now: number) => {
    if (done) return;
    const k = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, Math.round(from + (target - from) * ease(k)));
    if (k >= 1) { finish(); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Wheel/touch/key input hands control back immediately.
  (["wheel", "touchstart", "keydown"] as const).forEach((ev) =>
    window.addEventListener(ev, finish, { once: true, passive: true })
  );
  return true;
}

// QA - Web 2.0 §01: the nav is part of the single-page landing page, not a
// set of separate routes — every item scrolls to a section on "/" instead
// of navigating to its own page. "Contact" has no equivalent landing-page
// section, so it's kept as a real route to the existing /contact page.
const links = [
  { to: "/#platform", label: "Features", spyId: "platform" },
  { to: "/#faq", label: "FAQ", spyId: "faq" },
  { to: "/#pricing", label: "Pricing", spyId: "pricing" },
  { to: "/contact", label: "Contact", spyId: null },
];

/** Fixed, fully transparent nav overlaying the page content so section color
 *  and the hero canvas run behind it — v4 landing handoff: an earlier build
 *  used `position: sticky` with a `-72px` bottom margin to let the hero start
 *  beneath it, and that negative margin let the bar scroll away instead of
 *  staying pinned. `position: fixed` has zero flow height either way, so
 *  every other marketing page's existing top padding (tuned for the old
 *  zero-flow-height sticky nav) already clears it without change. Three
 *  palettes, evaluated in this priority order:
 *   1. `dark` (useNavTheme) — light-on-dark, for the other marketing pages'
 *      own `data-nav-dark` bands (Business/Product/Pricing/Contact). Home
 *      never marks a section dark, so this and `glass` never coexist.
 *   2. `glass` (useNavHeroGlass) — Home-only: over its hero the transparent
 *      pill has almost no contrast against the light lavender/teal gradient,
 *      so the pill/buttons gain a real glass fill and the logo lightens.
 *   3. plain — the default dark-ink-on-transparent look.
 *  Same-page hash links (Features/FAQ/Pricing) get a real active state via
 *  scroll-spy (useNavScrollSpy) — a no-op returning null on any page other
 *  than Home, where those section ids don't exist. Contact keeps its
 *  existing route-based active check since it's a real page, not a section. */
export const Nav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const dark = useNavTheme();
  const glass = useNavHeroGlass();
  const { pathname } = useLocation();
  const { active: spyActive, onLinkClick } = useNavScrollSpy(["platform", "pricing", "faq"]);
  // Logo plate is inverted relative to the nav pills: over the hero the
  // white-on-color lockup needs no plate of its own (setGlass(true) in the
  // handoff clears it to transparent), so it only appears once glass turns
  // off — i.e. past the hero, or on any page that never has a hero at all.
  // The `dark` palette is left alone here (data-nav-dark is inert on Home
  // per the handoff's "Known Deviations", but it's live and unrelated to
  // this glass mechanism on the other marketing pages, so it keeps its
  // existing plate-less treatment rather than gaining one now).
  const logoPlate = !dark && !glass;
  // v7 landing handoff §5.1: past the hero (or on any page with no hero at
  // all), the logo plate AND the links pill/Log in/burger all share this
  // one recipe now — "the same plate as the logo (fill .14, blur 120px, and
  // a border), on the pill too." Applied wherever `logoPlate` is true.
  // Previously the pill/Log in/burger had no background at all past the
  // hero (only Tailwind blur classes with nothing to blur), which is the
  // exact "pill goes transparent and links float over the page text" bug
  // the handoff calls out by name — fixed by giving them this style too.
  const pastHeroPlateStyle: React.CSSProperties = {
    background: "rgba(246,245,250,.14)",
    borderColor: "rgba(34,30,26,.08)",
    boxShadow: "0 6px 22px rgba(72,58,130,.10)",
    backdropFilter: "blur(120px) saturate(2.1)",
    WebkitBackdropFilter: "blur(120px) saturate(2.1)",
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[60] bg-transparent">
      <div
        className={clsx(
          "max-w-[1180px] mx-auto px-5 sm:px-10 h-[72px] flex items-center justify-between gap-6 transition-colors duration-300",
          dark ? "text-white" : "text-mkt-logo"
        )}
      >
        <Link
          to="/"
          className="group flex items-center gap-[10.9px] shrink-0 rounded-full border border-transparent transition-[background-color,backdrop-filter] duration-[450ms]"
          onClick={() => setOpen(false)}
          style={{
            padding: "9px 15px",
            ...(glass && !dark
              ? { color: "#FFFFFF", filter: "drop-shadow(0 2px 10px rgba(52,38,110,.42))" }
              : undefined),
            ...(logoPlate ? { ...pastHeroPlateStyle, border: "1px solid rgba(34,30,26,.08)" } : undefined),
          }}
        >
          <CentiumMark size={28} leafFill={dark ? "#FFFFFF" : glass ? "#D8F1EB" : "#8AC4BA"} />
          <CentiumWordmarkCropped height={11} />
        </Link>

        <nav
          className={clsx(
            "hidden lg:flex items-center gap-0.5 rounded-full p-1 backdrop-blur-[22px] backdrop-saturate-[1.8] transition-[background-color,border-color,box-shadow] duration-[450ms]",
            !dark && (glass || logoPlate) && "border"
          )}
          // Hero handoff README §7: when the hero canvas grades itself tier-1
          // (slow device), every [data-glassy] element on the page must drop
          // its backdrop-filter — not just the hero's own "Request a Demo"
          // pill. data-glassy-fallback repeats this pill's own existing glass
          // background (the value below is not itself named in the hero
          // handoff, which only specifies the CTA's fallback; it's reused
          // here as the closest already-correct value for this element).
          data-glassy=""
          data-glassy-fallback="rgba(255,255,255,.66)"
          style={
            glass && !dark
              ? { background: "rgba(255,255,255,.66)", borderColor: "rgba(255,255,255,.78)", boxShadow: "0 8px 26px rgba(72,58,130,.14)" }
              : logoPlate
                ? pastHeroPlateStyle
                : undefined
          }
          aria-label="Primary"
        >
          {links.map((l) => {
            const isActive = l.spyId ? spyActive === l.spyId : pathname === l.to;
            // Regression fix: `text-[#hex]` Tailwind arbitrary-value classes
            // silently lose to this app's unlayered `a { color: inherit }`
            // reset (verified: the utility rule generates and its
            // `--tw-text-opacity` custom property does apply, but `color`
            // itself still renders the inherited value) — every other custom
            // hex color in this codebase already goes through inline
            // `style` for exactly this reason; `<a>` text color needs the
            // same treatment rather than an arbitrary-value class.
            const inactiveClass = dark ? "text-white/[.82] hover:text-white" : glass ? "hover:text-mkt-ink" : "text-mkt-soft hover:text-mkt-ink";
            const inactiveStyle = !dark && glass ? { color: "#3B352D" } : undefined;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={(e) => {
                  if (!l.spyId) return;
                  onLinkClick(l.spyId);
                  if (scrollToSection(l.spyId)) e.preventDefault();
                }}
                aria-current={isActive ? "true" : undefined}
                className={clsx(
                  "px-4 py-2 rounded-full text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-200",
                  isActive ? (dark ? "bg-white/16 text-white" : undefined) : inactiveClass
                )}
                style={isActive ? (dark ? undefined : { background: "rgba(125,103,217,.14)", color: "#6A54C4" }) : inactiveStyle}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3.5 shrink-0">
          <Link
            to="/app"
            className={clsx(
              "tap text-[13.5px] font-semibold whitespace-nowrap px-[17px] py-[9px] rounded-full backdrop-blur-[22px] backdrop-saturate-[1.8] border transition-[transform,background-color,color,border-color] duration-150 active:scale-[.96]",
              dark
                ? "text-white/[.88] border-white/[.14]"
                : glass
                  ? "text-[#3B352D]"
                  : "text-mkt-soft border-mkt-ink/[.08]"
            )}
            data-glassy=""
            data-glassy-fallback="rgba(255,255,255,.66)"
            style={
              glass && !dark
                ? { background: "rgba(255,255,255,.66)", borderColor: "rgba(255,255,255,.78)", boxShadow: "0 8px 26px rgba(72,58,130,.14)" }
                : logoPlate
                  ? pastHeroPlateStyle
                  : undefined
            }
          >
            Log in
          </Link>
          <Link
            to="/app"
            className="tap px-[19px] py-2.5 rounded-full bg-mkt-accent text-white text-[13.5px] font-semibold whitespace-nowrap hover:bg-mkt-accent-hover transition-[background-color,transform] duration-150 active:scale-[.96]"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={clsx(
            "lg:hidden tap w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-[22px] backdrop-saturate-[1.8] border transition-[transform,color,background-color,border-color] duration-150 active:scale-[.96]",
            dark ? "text-white border-white/[.14]" : glass ? "text-[#3B352D]" : "text-mkt-ink border-mkt-ink/[.08]"
          )}
          data-glassy=""
          data-glassy-fallback="rgba(255,255,255,.66)"
          style={
            glass && !dark
              ? { background: "rgba(255,255,255,.66)", borderColor: "rgba(255,255,255,.78)", boxShadow: "0 8px 26px rgba(72,58,130,.14)" }
              : logoPlate
                ? pastHeroPlateStyle
                : undefined
          }
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className={clsx(
            "lg:hidden mx-3 mb-3 p-4 rounded-[20px] border backdrop-blur-[22px] backdrop-saturate-[1.8] shadow-[0_18px_50px_rgba(34,30,26,.14)] animate-fade-slide-up",
            dark ? "bg-[#131024]/[.72] border-white/[.14]" : "bg-[#FAF9FC]/[.62] border-mkt-ink/[.08]"
          )}
        >
          <nav className="flex flex-col gap-1" aria-label="Primary">
            {links.map((l) => {
              const isActive = l.spyId ? spyActive === l.spyId : pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={(e) => {
                    setOpen(false);
                    if (!l.spyId) return;
                    onLinkClick(l.spyId);
                    if (scrollToSection(l.spyId)) e.preventDefault();
                  }}
                  className={clsx(
                    "px-3 py-2.5 rounded-xl text-sm font-semibold",
                    isActive ? (dark ? "text-white bg-white/[.14]" : undefined) : dark ? "text-white/[.85]" : "text-mkt-soft"
                  )}
                  style={isActive && !dark ? { background: "rgba(125,103,217,.14)", color: "#6A54C4" } : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-mkt-line">
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="tap flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-mkt-soft bg-mkt-wash2"
            >
              Log in
            </Link>
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="tap flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-mkt-accent text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

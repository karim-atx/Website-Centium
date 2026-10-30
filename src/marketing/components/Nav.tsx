import React, { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { EntiumWordmark } from "../../components/icons/CentiumMark";
import { LG, SM, reducedMotion } from "../landing/engine/env";
import { landingState, spyClick } from "../landing/state";
import { anchorHash, loaderEntryFor } from "../landing/loading/pickLoader";
import { scrollToSection, useMarketingNav } from "../landing/navigation";
import { LEAF_TEAL, LOGO_LAVENDER, MARK_C_PATH, MARK_LEAF_PATH } from "../landing/paths";
import { LanguageSwitch } from "./LanguageSwitch";
import { t, tk } from "../../i18n/core";

// Centium landing v29: NV1 v16, the Original navbar (02_pages/01-NV1 and the
// prototype's navVals / navClick), replacing the previous glass/dark-band nav.
// - A solid plate, rgba(250,249,252,.94), no backdrop blur, on every page.
// - On the landing it is hidden during loading and the intro and slides in at
//   intro progress 0.79..0.83 (the scroll engine writes its transform and
//   opacity); it is visible at once on other pages, under LO2, and when the
//   landing opens on an anchor.
// - Features / FAQ / Pricing scroll to their landing section (minus 72px) and
//   light up from the scroll-spy; Contact is its own page. Log in and Get
//   Started open the web app (/app), as before.
// - Kept from the previous nav: aria-current on the active link, aria-expanded
//   and "Open menu" / "Close menu" on the burger.
// - The logo is the official mark and "entium" wordmark (CentiumMark.tsx),
//   whose geometry is the prototype's own nav logo (28px mark, 100.42 x 11px word).

const PLATE = { bg: "rgba(250,249,252,.94)", border: "rgba(34,30,26,.08)", shadow: "0 6px 22px rgba(72,58,130,.10)" };

const LINKS: { href: string; label: string; id: string | null }[] = [
  { href: "/#platform", label: tk("Features"), id: "platform" },
  { href: "/#faq", label: tk("FAQ"), id: "faq" },
  { href: "/#pricing", label: tk("Pricing"), id: "pricing" },
  { href: "/contact", label: tk("Contact"), id: null },
];

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getVw = () => window.innerWidth;
const getSpy = () => landingState.get().spy;
const getMenuOpen = () => landingState.get().menuOpen;

// The current section's link, beyond the pill (1.2:1 on the plate, so not
// enough alone): 800 with a thin teal underline. A hidden 800 copy holds the
// width, so the links beside it don't move as the scroll-spy changes.
const NavLabel: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <span style={{ display: "inline-grid" }}>
    <span
      style={{
        gridArea: "1 / 1",
        fontWeight: active ? 800 : 600,
        textDecorationLine: active ? "underline" : "none",
        textDecorationColor: "#4A7D76",
        textDecorationThickness: "1.5px",
        textUnderlineOffset: "4px",
      }}
    >
      {label}
    </span>
    <span aria-hidden="true" style={{ gridArea: "1 / 1", fontWeight: 800, visibility: "hidden" }}>
      {label}
    </span>
  </span>
);

const plainClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export const Nav: React.FC = () => {
  const location = useLocation();
  const vw = useSyncExternalStore(subscribeResize, getVw, getVw);
  const lg = vw >= LG;
  const spy = useSyncExternalStore(landingState.subscribe, getSpy, getSpy);
  const menuOpen = useSyncExternalStore(landingState.subscribe, getMenuOpen, getMenuOpen);
  const go = useMarketingNav();
  const headerRef = useRef<HTMLElement>(null);
  const home = location.pathname === "/";
  const contact = location.pathname === "/contact";

  // Initial visibility per page (prototype navVals `nv`): on the landing,
  // hidden unless LO2 runs or it opened on an anchor; the engine takes over
  // from its first scroll pass. Elsewhere: visible. Written here, not through
  // the style prop, because the engine owns these properties afterwards.
  useLayoutEffect(() => {
    const hd = headerRef.current;
    if (!hd) return;
    const entry = loaderEntryFor(location.key, location.pathname, location.hash);
    const nv = !home || entry.kind === "lo2" || anchorHash(location.hash) ? 1 : 0;
    hd.style.transform = "translateY(" + ((nv - 1) * 100).toFixed(1) + "%)";
    hd.style.opacity = String(nv);
    hd.style.pointerEvents = nv > 0.5 ? "auto" : "none";
    landingState.set({ menuOpen: false, spy: null });
    // Only when the page changes; a same-page hash change keeps the engine's state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const setMenu = (open: boolean) => landingState.set({ menuOpen: open });

  // Prototype navClick.
  const navClick = (id: string | null, close: boolean) => (e: React.MouseEvent) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    if (close) setMenu(false);
    if (!id) {
      go("/contact");
      return;
    }
    if (!home) {
      go("/#" + id);
      return;
    }
    spyClick.at = Date.now();
    landingState.set({ spy: id });
    scrollToSection(id);
  };

  // Prototype goHomeNav.
  const goHomeNav = (e: React.MouseEvent) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    setMenu(false);
    if (home) window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    else go("/");
  };

  const leaf = (on: boolean) => () => {
    const l = document.getElementById("nav-leaf");
    if (l) l.style.transform = on ? "rotate(7.5deg)" : "none";
  };

  const links = LINKS.map((l) => {
    const active = l.id ? home && spy === l.id : contact;
    return { ...l, active, bg: active ? "rgba(125,103,217,.14)" : "transparent", color: active ? "#6A54C4" : "#5B5349", hoverColor: active ? "#6A54C4" : "#221E1A" };
  });

  return (
    <header
      id="site-nav"
      ref={headerRef}
      style={{
        position: "fixed",
        top: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 60,
        background: "transparent",
        paddingTop: "env(safe-area-inset-top)",
        willChange: "transform,opacity",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "0 " + (vw >= SM ? "40px" : "20px"),
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <a
          id="nav-logo"
          href="/"
          aria-label={t("Centium home")}
          onClick={goHomeNav}
          onMouseEnter={leaf(true)}
          onMouseLeave={leaf(false)}
          onFocus={leaf(true)}
          onBlur={leaf(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10.9px",
            flexShrink: 0,
            borderRadius: "999px",
            padding: "9px 15px",
            transition: "background-color .45s",
            color: LOGO_LAVENDER,
            filter: "none",
            background: PLATE.bg,
            border: "1px solid " + PLATE.border,
            boxShadow: PLATE.shadow,
          }}
        >
          <span id="nav-mark" style={{ position: "relative", display: "block", flexShrink: 0, width: "28px", height: "28px" }}>
            <svg viewBox="270 180 690 730" fill="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
              <path d={MARK_C_PATH} fill="currentColor" />
            </svg>
            <svg
              id="nav-leaf"
              viewBox="270 180 690 730"
              fill="none"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
                transition: "transform .5s cubic-bezier(.22,1,.36,1)",
                transformOrigin: "43.32% 96.36%",
                transform: "none",
              }}
            >
              <path d={MARK_LEAF_PATH} fill={LEAF_TEAL} />
            </svg>
          </span>
          <EntiumWordmark height={11} style={{ flexShrink: 0, overflow: "visible" }} />
        </a>
        {lg ? (
          <>
            <nav
              aria-label={t("Primary")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                borderRadius: "999px",
                padding: "4px",
                background: PLATE.bg,
                border: "1px solid " + PLATE.border,
                boxShadow: PLATE.shadow,
                transition: "background-color .45s,border-color .45s,box-shadow .45s",
              }}
            >
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={navClick(l.id, false)}
                  aria-current={l.active ? "true" : undefined}
                  className="cl-hc"
                  style={
                    {
                      padding: "8px 16px",
                      borderRadius: "999px",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      transition: "color .2s",
                      background: l.bg,
                      color: l.color,
                      "--hc": l.hoverColor,
                    } as React.CSSProperties
                  }
                >
                  <NavLabel label={t(l.label)} active={l.active} />
                </a>
              ))}
            </nav>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
              <Link
                to="/app"
                className="cl-hbg cl-hbd cl-hc cl-abg"
                style={
                  {
                    fontSize: "13.5px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    padding: "9px 17px",
                    borderRadius: "999px",
                    border: "1px solid " + PLATE.border,
                    background: PLATE.bg,
                    boxShadow: PLATE.shadow,
                    color: "#5B5349",
                    transition: "background-color .2s,border-color .2s,color .2s",
                    "--hbg": "#FFFFFF",
                    "--hbd": "rgba(125,103,217,.28)",
                    "--hc": "#221E1A",
                    "--abg": "#F4F1FB",
                  } as React.CSSProperties
                }
              >
                {t("Log in")}
              </Link>
              <Link
                to="/app"
                className="cl-hbg cl-press"
                style={
                  {
                    padding: "10px 19px",
                    borderRadius: "999px",
                    background: "#775FD7",
                    color: "#fff",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "background-color .15s,transform .15s",
                    "--hbg": "#6A54C4",
                  } as React.CSSProperties
                }
              >
                {t("Get Started")}
              </Link>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMenu(!menuOpen)}
            aria-label={menuOpen ? t("Close menu") : t("Open menu")}
            aria-expanded={menuOpen}
            className="cl-press"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid " + PLATE.border,
              background: PLATE.bg,
              boxShadow: PLATE.shadow,
              color: "#221E1A",
              transition: "transform .15s",
            }}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        )}
      </div>
      {menuOpen && !lg && (
        <div
          id="nav-menu"
          style={{
            margin: "0 12px 12px",
            padding: "16px",
            borderRadius: "20px",
            border: "1px solid rgba(34,30,26,.08)",
            background: "rgba(250,249,252,.97)",
            boxShadow: "0 6px 22px rgba(72,58,130,.10)",
            animation: reducedMotion() ? "none" : "centium-menu-in .45s cubic-bezier(.22,1,.36,1) both",
          }}
        >
          <nav aria-label={t("Primary")} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={navClick(l.id, true)}
                aria-current={l.active ? "true" : undefined}
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  lineHeight: "20px",
                  fontWeight: 600,
                  background: l.bg,
                  color: l.active ? "#6A54C4" : "#5B5349",
                }}
              >
                <NavLabel label={t(l.label)} active={l.active} />
              </a>
            ))}
          </nav>
          {/* Round F (AV): the language switch, above Log in. */}
          <div style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
            <LanguageSwitch />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #EDEAE4" }}>
            <Link
              to="/app"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 600,
                color: "#5B5349",
                background: "#FAF9F7",
              }}
            >
              {t("Log in")}
            </Link>
            <Link
              to="/app"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 600,
                background: "#775FD7",
                color: "#fff",
              }}
            >
              {t("Get Started")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

// Task O (design-handover/task-o/PLAN.md): the landing page's one download
// button, in the slot and with the styles of the button it replaced
// ("Request a Demo", decision 1) in the hero and the closing CTA. It shows
// what platforms.ts gives for the visitor's system, falling back to "Open
// Centium in your browser" (/app) while a platform has no link. Under it, a
// small "Other platforms" link opens a list of every platform (decision 2).
//
// Layout (Karim, 2026-11-09): Get Started and the download button(s) are one
// CSS grid (ctaGrid.ts) with equal columns: every button is as wide as the
// widest label, never narrower than the old slot (ctaW, 200px), the group
// centred; below 640px (and in the CTA's column layout) one full-width
// column, as before. This component renders grid items: its buttons, then a
// zero-height item at the bottom of the last button's cell holding the
// "Other platforms" link (position: absolute), so nothing moves and no row
// grows. The list is drawn in the site root (a portal, position: fixed,
// z-index 5): in the hero, #intro-track (z-index 2) sits under the phone layer
// (fixed, z-index 4), which would cover it; the navbar (60) stays above. It
// opens under the link, or above it when there is more room there, and
// scrolls inside itself if neither side holds it, so every row stays on
// screen. It closes on Escape, a click outside, a second click, or a scroll.
// Keyboard: Tab from the open link enters the list, Shift+Tab from its first
// link comes back, Tab from its last link closes it and moves on.
// Styles reused from the site: the link is the footer's small text link
// (FT1: 13px / 500 / #5B5349, the 1px underline that grows on hover, hover
// #6A54C4, 44px tall); the list is the navbar's mobile menu card and its
// rows (NV1: 20px radius, #nav-menu's border and shadow, the
// centium-menu-in entrance; rows 10px 12px / 12px radius / 14px / 600), on
// the landing's opaque card surface #FFFFFF.

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { t } from "../../i18n/core";
import { reducedMotion } from "../landing/engine/env";
import { COMING_SOON, DOWNLOAD_LINKS, detectPlatform, downloadOptions, platformList, type DownloadOption, type NavLike, type Platform } from "./platforms";

// Detection runs once on the client, the first time a button renders: only
// navigator's low-entropy fields are read, and nothing is stored or sent.
let detected: Platform | null = null;
const clientPlatform = (): Platform => (detected ??= detectPlatform(navigator as unknown as NavLike));

const UNDERLINE = "linear-gradient(#6A54C4,#6A54C4) 0 calc(100% - 3px) / 0 1px no-repeat";
/** The site's 16px side gutter: the list never comes closer to the screen's edge. */
const GUTTER = 16;

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/** A real link: the web app through the router, store pages and the .dmg in the same tab. */
const OptionLink: React.FC<AnchorProps & { o: DownloadOption }> = ({ o, children, ...rest }) =>
  o.href.startsWith("/") ? (
    <Link to={o.href} {...rest}>
      {children}
    </Link>
  ) : (
    <a href={o.href} {...rest}>
      {children}
    </a>
  );

const ROW: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "10px 12px",
  borderRadius: "12px",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 600,
  color: "#5B5349",
};

interface Props {
  /** The replaced button's style, without a width (the grid sets it). */
  btnStyle: React.CSSProperties;
  /** true: the group is one column (below 640px, the CTA's column layout). */
  stack: boolean;
}

export const DownloadButton: React.FC<Props> = ({ btnStyle, stack }) => {
  const [platform] = useState(clientPlatform);
  const [open, setOpen] = useState(false);
  // Where the list is drawn: the site root (.centium-site, for its fonts,
  // direction and hover rules), found on the first open.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const options = downloadOptions(platform, DOWNLOAD_LINKS);
  const rows = platformList(DOWNLOAD_LINKS);
  const n = options.length;

  // Placed under the link, or above it when there is more room there; if
  // neither side holds the whole list it scrolls inside itself. Centred on
  // the link and kept 16px inside the screen.
  useLayoutEffect(() => {
    const tg = toggle.current, ul = list.current;
    if (!open || !tg || !ul) return;
    ul.style.maxHeight = "";
    ul.style.overflowY = "";
    const k = tg.getBoundingClientRect();
    const w = ul.offsetWidth, h = ul.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const below = vh - GUTTER - k.bottom, above = k.top - GUTTER;
    const up = h > below && above > below;
    const room = up ? above : below;
    if (h > room) {
      ul.style.maxHeight = `${room}px`;
      ul.style.overflowY = "auto";
    }
    ul.style.top = `${up ? k.top - Math.min(h, room) : k.bottom}px`;
    ul.style.left = `${Math.max(GUTTER, Math.min(vw - GUTTER - w, k.left + k.width / 2 - w / 2))}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (n: Node | null) => !!n && (!!toggle.current?.contains(n) || !!list.current?.contains(n));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inside(document.activeElement)) toggle.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target as Node)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // The list sits elsewhere in the page, so Tab is carried across by hand.
  const onToggleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (open && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      list.current?.querySelector("a")?.focus({ preventScroll: true });
    }
  };
  const onListKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "Tab") return;
    const links = Array.from(list.current?.querySelectorAll("a") ?? []);
    const i = links.indexOf(e.target as HTMLAnchorElement);
    if (e.shiftKey && i === 0) {
      e.preventDefault();
      toggle.current?.focus({ preventScroll: true });
    } else if (!e.shiftKey && i === links.length - 1) {
      // Close, put focus back on the link, and let this Tab move on from it.
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    }
  };

  return (
    <>
      {options.map((o, i) => (
        <OptionLink
          key={o.id}
          o={o}
          data-download=""
          className="cl-lift"
          style={{ ...btnStyle, ...(stack ? { gridColumn: 1, gridRow: 2 + i } : { gridRow: 1, gridColumn: 2 + i }) }}
        >
          {t(o.label)}
        </OptionLink>
      ))}
      <div
        data-download-toggle=""
        style={{ position: "relative", alignSelf: "end", height: 0, ...(stack ? { gridColumn: 1, gridRow: 1 + n } : { gridRow: 1, gridColumn: `2 / span ${n}` }) }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => {
              setHost(toggle.current?.closest<HTMLElement>(".centium-site") ?? document.body);
              setOpen(!open);
            }}
            onKeyDown={onToggleKey}
            className="cl-hc cl-uline"
            style={
              {
                minHeight: "44px",
                display: "inline-flex",
                alignItems: "center",
                padding: 0,
                fontSize: "13px",
                fontWeight: 500,
                color: "#5B5349",
                whiteSpace: "nowrap",
                background: UNDERLINE,
                transition: "background-size .3s cubic-bezier(.22,1,.36,1),color .2s",
                "--hc": "#6A54C4",
              } as React.CSSProperties
            }
          >
            {t("Other platforms")}
          </button>
        </div>
      </div>
      {host &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            data-download-list=""
            hidden={!open}
            onKeyDown={onListKey}
            style={{
              position: "fixed",
              zIndex: 5,
              top: 0,
              left: 0,
              listStyle: "none",
              margin: 0,
              padding: "8px",
              minWidth: "240px",
              maxWidth: `calc(100vw - ${2 * GUTTER}px)`,
              textAlign: "start",
              borderRadius: "20px",
              border: "1px solid rgba(34,30,26,.08)",
              background: "#FFFFFF",
              boxShadow: "0 6px 22px rgba(72,58,130,.10)",
              animation: reducedMotion() ? "none" : "centium-menu-in .45s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            {rows.map((p) => (
              <li key={p.name}>
                {p.option ? (
                  <OptionLink
                    o={p.option}
                    className="cl-hbg cl-hc"
                    style={
                      {
                        ...ROW,
                        transition: "background-color .2s,color .2s",
                        "--hbg": "#F4F1FB",
                        "--hc": "#221E1A",
                      } as React.CSSProperties
                    }
                  >
                    <span style={{ color: "#221E1A" }}>{t(p.name)}</span>
                    <span className="sr-only">, </span>
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>{t(p.option.label)}</span>
                  </OptionLink>
                ) : (
                  // No link yet: plain text, read as "Windows, Coming soon".
                  <div style={ROW}>
                    <span style={{ color: "#221E1A" }}>{t(p.name)}</span>
                    <span className="sr-only">, </span>
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>{t(COMING_SOON)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>,
          host,
        )}
    </>
  );
};

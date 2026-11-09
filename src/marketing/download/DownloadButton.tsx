// Task O (design-handover/task-o/PLAN.md): the landing page's one download
// button, in the slot and with the exact styles of the button it replaced
// ("Request a Demo", decision 1) in the hero and the closing CTA. It shows
// what platforms.ts gives for the visitor's system, falling back to "Open
// Centium in your browser" (/app) while a platform has no link. Under it, a
// small "Other platforms" link opens a list of every option (decision 2).
//
// Layout: the button row keeps the replaced button's box; the "Other
// platforms" link hangs below it (position: absolute), so nothing in the hero
// or the CTA moves and Get Started keeps its height. The list is drawn in the
// site root (a portal, position: fixed, z-index 5) under the link: in the
// hero, #intro-track (z-index 2) sits under the phone layer (fixed, z-index
// 4), which would cover it; the navbar (60) stays above. It closes on
// Escape, a click outside, a second click, or a scroll. Keyboard: Tab from
// the open link enters the list, Shift+Tab from its first row comes back,
// Tab from its last row closes it and moves on from the link.
// Styles reused from the site: the link is the footer's small text link
// (FT1: 13px / 500 / #5B5349, the 1px underline that grows on hover, hover
// #6A54C4, 44px tall); the list is the navbar's mobile menu card and its
// rows (NV1: 20px radius, #nav-menu's border, background and shadow, the
// centium-menu-in entrance; rows 10px 12px / 12px radius / 14px / 600).

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { t } from "../../i18n/core";
import { reducedMotion } from "../landing/engine/env";
import { DOWNLOAD_LINKS, detectPlatform, downloadOptions, platformList, type DownloadOption, type NavLike, type Platform } from "./platforms";

// Detection runs once on the client, the first time a button renders: only
// navigator's low-entropy fields are read, and nothing is stored or sent.
let detected: Platform | null = null;
const clientPlatform = (): Platform => (detected ??= detectPlatform(navigator as unknown as NavLike));

const UNDERLINE = "linear-gradient(#6A54C4,#6A54C4) 0 calc(100% - 3px) / 0 1px no-repeat";
/** The site's 16px side gutter: the list never comes closer to the screen's edge. */
const GUTTER = 16;

/** A real link: the web app through the router, store pages and the .dmg in the same tab. */
const OptionLink: React.FC<{
  o: DownloadOption;
  style: React.CSSProperties;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLAnchorElement>) => void;
  children: React.ReactNode;
}> = ({ o, style, className, onKeyDown, children }) =>
  o.href.startsWith("/") ? (
    <Link to={o.href} className={className} style={style} onKeyDown={onKeyDown}>
      {children}
    </Link>
  ) : (
    <a href={o.href} className={className} style={style} onKeyDown={onKeyDown}>
      {children}
    </a>
  );

interface Props {
  /** The replaced button's exact style, without its width. */
  btnStyle: React.CSSProperties;
  /** The replaced button's width (ctaW), now a minimum: the longer labels
   *  ("Open Centium in your browser" is wider than 200px at 15px / 600)
   *  widen the pill instead of wrapping or overflowing it, and a label that
   *  fits keeps the replaced button's exact box. */
  width: string;
}

export const DownloadButton: React.FC<Props> = ({ btnStyle, width }) => {
  const [platform] = useState(clientPlatform);
  const [open, setOpen] = useState(false);
  // Where the list is drawn: the site root (.centium-site, for its fonts,
  // direction and hover rules), found on the first open.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const options = downloadOptions(platform, DOWNLOAD_LINKS);
  const rows = platformList(DOWNLOAD_LINKS);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) toggle.current?.focus({ preventScroll: true });
  };

  // Under the link, centred on it, kept 16px inside the screen.
  useLayoutEffect(() => {
    const tg = toggle.current, ul = list.current;
    if (!open || !tg || !ul) return;
    const k = tg.getBoundingClientRect();
    const w = ul.offsetWidth, vw = document.documentElement.clientWidth;
    ul.style.top = `${k.bottom}px`;
    ul.style.left = `${Math.max(GUTTER, Math.min(vw - GUTTER - w, k.left + k.width / 2 - w / 2))}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const inside = (n: Node | null) => !!n && (!!wrap.current?.contains(n) || !!list.current?.contains(n));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(inside(document.activeElement));
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
  const onRowKey = (i: number) => (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey && i === 0) {
      e.preventDefault();
      toggle.current?.focus({ preventScroll: true });
    } else if (!e.shiftKey && i === rows.length - 1) {
      // Close, put focus back on the link, and let this Tab move on from it.
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    }
  };

  return (
    <div
      ref={wrap}
      data-download=""
      style={{
        position: "relative",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "12px",
        // Two buttons (an unknown system with both desktop links set) sit
        // side by side, or stack when they are full width.
        minWidth: width,
      }}
    >
      {options.map((o) => (
        <OptionLink key={o.id} o={o} className="cl-lift" style={{ ...btnStyle, minWidth: width }}>
          {t(o.label)}
        </OptionLink>
      ))}
      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setHost(wrap.current?.closest<HTMLElement>(".centium-site") ?? document.body);
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
      {host &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            data-download-list=""
            hidden={!open}
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
              background: "rgba(250,249,252,.97)",
              boxShadow: "0 6px 22px rgba(72,58,130,.10)",
              animation: reducedMotion() ? "none" : "centium-menu-in .45s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            {rows.map((p, i) => (
              <li key={p.name ?? "browser"}>
                <OptionLink
                  o={p.option}
                  onKeyDown={onRowKey(i)}
                  className="cl-hbg cl-hc"
                  style={
                    {
                      display: "flex",
                      flexDirection: "column",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      lineHeight: "20px",
                      fontWeight: 600,
                      color: "#5B5349",
                      transition: "background-color .2s,color .2s",
                      "--hbg": "#F4F1FB",
                      "--hc": "#221E1A",
                    } as React.CSSProperties
                  }
                >
                  {p.name ? (
                    <>
                      <span style={{ color: "#221E1A" }}>{t(p.name)}</span>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{t(p.option.label)}</span>
                    </>
                  ) : (
                    t(p.option.label)
                  )}
                </OptionLink>
              </li>
            ))}
          </ul>,
          host,
        )}
    </div>
  );
};

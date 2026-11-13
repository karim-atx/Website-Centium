// The landing page's "Download the app" button (Task O, then FM:
// design-handover/task-fm-fj/PLAN.md), in the slot and with the styles of
// the "Request a Demo" button it replaced, in the hero and the closing CTA.
// It shows the visitor's own download (platforms.ts); where there is none,
// or inside the desktop app, it is not drawn and Get Started stands alone.
//
// Layout: Get Started and the download button are one CSS grid (ctaGrid.ts)
// with equal columns: both as wide as the wider label, never narrower than
// the old slot (ctaW, 200px), the group centred; below 640px (and in the
// CTA's column layout) one full-width column. Get Started is placed in the
// first cell by its section. This component renders grid items: the button,
// then a zero-height item at the bottom of the last button's cell holding
// what hangs under it (position: absolute), so nothing moves and no row
// grows:
//   - on Windows (and an unknown system), the help line: what the download
//     is, the SmartScreen warning, "version X" when versions.json answers,
//     and "Why?", which opens a short help panel (the two warnings, Smart
//     App Control, updates, the SHA-256 checksums when SHA256SUMS.txt
//     answers);
//   - "Other download (ARM64)" / "(x64)": the other architecture (D8);
//   - "Other platforms", which opens the list of every platform.
// The hero (compact) has room for one 44px row before the phone layer covers
// the page, as on main: there the help line moves into the panel, opened by
// "Install help" in that row (and is still read with the button). The CTA
// passes `room`, its free space under the group; if the help line needs more,
// a spacer row grows the group by the difference.
// With no button, the hanging item sits under Get Started; in the stacked
// layout an invisible copy of the button keeps its row, so the page below
// does not move.
//
// The two panels are drawn in the site root (a portal, position: fixed,
// z-index 5): in the hero, #intro-track (z-index 2) sits under the phone
// layer (fixed, z-index 4), which would cover them; the navbar (60) stays
// above. Placement, closing and keyboard: anchoredPanel.ts.
// DESKTOP (1024px and wider, or a computer at any width: desktopLayout in
// platforms.ts; Karim 2026-11-13): the hero row and the CTA
// show only the two buttons. "Download the app" is a toggle (with a chevron
// that turns) opening one panel under it (DesktopDownload below): "Download
// for Windows", the size and version line, the short unsigned-app note with
// "Why?", then "Other download", "Other platforms" and "Install help", which
// open their existing content inside the panel. After a download starts the
// panel stays open and says so. Phones and tablets below 1024px: unchanged.
// Styles reused from the site: the small links are the footer's small text
// link (FT1: 13px / 500 / #5B5349, the 1px underline that grows on hover,
// hover #6A54C4, 44px tall); the panels are the navbar's mobile menu card
// and its rows (NV1: 20px radius, #nav-menu's border and shadow, the
// centium-menu-in entrance; rows 10px 12px / 12px radius / 14px / 600), on
// the landing's opaque card surface #FFFFFF.

import React, { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { t } from "../../i18n/core";
import { reducedMotion } from "../landing/engine/env";
import { GUTTER, useAnchoredPanel } from "./anchoredPanel";
import {
  COMING_SOON,
  DOWNLOAD_LINKS,
  DOWNLOAD_THE_APP,
  desktopLayout,
  detectPlatform,
  detectWindowsArch,
  downloadOption,
  platformList,
  readWindowsSums,
  readWindowsVersion,
  type Checksum,
  type NavLike,
  type Platform,
  type WindowsArch,
} from "./platforms";

// Detection runs once on the client, the first time a button renders: only
// navigator's fields are read (and, on Windows, Chromium's architecture
// hint), and nothing is stored or sent.
let detected: Platform | null = null;
const clientPlatform = (): Platform => (detected ??= detectPlatform(navigator as unknown as NavLike));
let archRead: Promise<WindowsArch> | null = null;
const clientArch = () => (archRead ??= detectWindowsArch(navigator as unknown as NavLike));

/** How an architecture is written (not translated). */
const ARCH: Record<WindowsArch, string> = { x64: "x64", arm64: "ARM64" };

const UNDERLINE = "linear-gradient(#6A54C4,#6A54C4) 0 calc(100% - 3px) / 0 1px no-repeat";

/** The footer's small text link (FT1), for "Other download" and "Other platforms". */
const SMALL_LINK = {
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
} as React.CSSProperties;

/** The navbar's mobile menu card (NV1), for both panels. */
const CARD: React.CSSProperties = {
  position: "fixed",
  zIndex: 5,
  top: 0,
  left: 0,
  margin: 0,
  maxWidth: `calc(100vw - ${2 * GUTTER}px)`,
  textAlign: "start",
  borderRadius: "20px",
  border: "1px solid rgba(34,30,26,.08)",
  background: "#FFFFFF",
  boxShadow: "0 6px 22px rgba(72,58,130,.10)",
};

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

const LINK_ROW = {
  ...ROW,
  transition: "background-color .2s,color .2s",
  "--hbg": "#F4F1FB",
  "--hc": "#221E1A",
} as React.CSSProperties;

/** The hanging help line and the small links: as wide as this, centred on
 *  the button; the hero's one row of three links may use the screen's width. */
const HANG_W = `min(340px, calc(100vw - ${2 * GUTTER}px))`;
const HANG_W_COMPACT = `min(480px, calc(100vw - ${2 * GUTTER}px))`;

/** The help line's text (Karim's approved wording), with "version X" when versions.json answered. */
const helpText = (version: string | null) =>
  `${version ? t("Windows 10 and 11 · free · about 2 MB · version {v}.", { v: version }) : t("Windows 10 and 11 · free · about 2 MB.")} ${t(
    'Windows may say it "protected your PC" because Centium isn\'t signed yet. Choose More info → Run anyway.',
  )}`;

const HELP: React.CSSProperties = { margin: 0, fontSize: "12px", lineHeight: "18px", fontWeight: 500, color: "#5B5349", whiteSpace: "normal" };

/** The desktop layout (the popover): from this width, or on a computer (a
 *  hovering mouse or trackpad on a desktop system) at any width, so browser
 *  zoom, display scaling or a smaller window never bring back the old line
 *  and links (desktopLayout). Phones and tablets below it: the page as before. */
const WIDE_QUERY = "(min-width: 1024px)";
const FINE_QUERY = "(hover: hover) and (pointer: fine)";
const subscribeDesktop = (cb: () => void) => {
  const mqs = [WIDE_QUERY, FINE_QUERY].map((q) => window.matchMedia?.(q));
  mqs.forEach((mq) => mq?.addEventListener?.("change", cb));
  return () => mqs.forEach((mq) => mq?.removeEventListener?.("change", cb));
};
const matches = (q: string) => !!window.matchMedia?.(q).matches;
const isDesktopLayout = () => desktopLayout(matches(WIDE_QUERY), matches(FINE_QUERY), clientPlatform());
const useDesktopLayout = () => useSyncExternalStore(subscribeDesktop, isDesktopLayout, () => false);

interface Props {
  /** The replaced button's style, without a width (the grid sets it). */
  btnStyle: React.CSSProperties;
  /** true: the group is one column (below 640px, the CTA's column layout). */
  stack: boolean;
  /** The hero: only one 44px row fits under the buttons before the phone
   *  layer covers the page, so on Windows the help line moves into the
   *  "Install help" panel and the small links share that one row. */
  compact?: boolean;
  /** Px under the group the hanging items may fill before the page below has
   *  to make room (the CTA: its bottom padding less 24px). Beyond it, a
   *  spacer row grows the group. Omitted: never (the hero, absolutely placed). */
  room?: number;
}

export const DownloadButton: React.FC<Props> = ({ btnStyle, stack, compact = false, room }) => {
  const [platform] = useState(clientPlatform);
  const [arch, setArch] = useState<WindowsArch>("x64");
  const [version, setVersion] = useState<string | null>(null);
  const [sums, setSums] = useState<Checksum[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [extra, setExtra] = useState(0);
  // Where the panels are drawn: the site root (.centium-site, for its fonts,
  // direction and hover rules), found on the first open.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const { toggle: listToggle, panel: listPanel, onToggleKey: onListToggleKey, onPanelKey: onListKey } = useAnchoredPanel<HTMLUListElement>(listOpen, setListOpen);
  const { toggle: whyToggle, panel: whyPanel, onToggleKey: onWhyToggleKey, onPanelKey: onWhyKey } = useAnchoredPanel<HTMLDivElement>(whyOpen, setWhyOpen);
  const hang = useRef<HTMLDivElement>(null);
  const listId = useId();
  const whyId = useId();
  const helpId = useId();
  const desktop = useDesktopLayout();
  const option = downloadOption(platform, DOWNLOAD_LINKS, arch);
  const rows = platformList(DOWNLOAD_LINKS, arch);
  const win = option?.id === "windows";
  const n = option ? 1 : 0;

  // The architecture hint is asked for only where the Windows button shows.
  useEffect(() => {
    if (win && platform === "windows") void clientArch().then(setArch);
  }, [win, platform]);
  useEffect(() => {
    if (win) void readWindowsVersion().then(setVersion);
  }, [win]);
  useEffect(() => {
    if (whyOpen) void readWindowsSums(version).then(setSums);
  }, [whyOpen, version]);
  // The CTA: how far the hanging items reach past `room` (the spacer row's
  // height plus its 12px gap), followed as the text wraps or the version arrives.
  useLayoutEffect(() => {
    const el = hang.current;
    if (room === undefined || !el) return;
    const fit = () => setExtra(Math.max(0, Math.ceil(el.offsetHeight - room)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [room]);

  const openFrom = (el: HTMLElement | null) => setHost(el?.closest<HTMLElement>(".centium-site") ?? document.body);

  // Desktop with a download: the two buttons only, and the panel (no hanging line, no links under the row).
  if (desktop && option) return <DesktopDownload option={option} rows={rows} version={version} btnStyle={btnStyle} stack={stack} />;
  const enter = reducedMotion() ? "none" : "centium-menu-in .45s cubic-bezier(.22,1,.36,1) both";
  const whyProps = {
    ref: whyToggle,
    type: "button" as const,
    "aria-expanded": whyOpen,
    "aria-controls": whyId,
    "data-download-why": "",
    onClick: () => {
      openFrom(whyToggle.current);
      setWhyOpen(!whyOpen);
    },
    onKeyDown: onWhyToggleKey,
  };

  // "Other download": the other Windows architecture (D8).
  const otherLink = win && option.other && (
    <a href={option.other.href} data-download-other="" className="cl-hc cl-uline" style={SMALL_LINK}>
      {t("Other download ({arch})", { arch: ARCH[option.other.arch] })}
    </a>
  );

  return (
    <>
      {option ? (
        <a
          href={option.href}
          data-download=""
          aria-describedby={win ? helpId : undefined}
          className="cl-lift"
          style={{ ...btnStyle, ...(stack ? { gridColumn: 1, gridRow: 2 } : { gridRow: 1, gridColumn: 2 }) }}
        >
          {t(option.label)}
        </a>
      ) : (
        // No download: an invisible copy keeps the button's height, so nothing
        // moves. Stacked, it keeps the second row; in a row it shares Get
        // Started's cell at zero width (the row keeps the bordered button's
        // 54.5px; Get Started alone is 52.5px), so Get Started keeps its width.
        <span
          aria-hidden
          data-download-slot=""
          style={{
            ...btnStyle,
            visibility: "hidden",
            ...(stack ? { gridColumn: 1, gridRow: 2 } : { gridColumn: 1, gridRow: 1, width: 0, minWidth: 0, paddingLeft: 0, paddingRight: 0, overflow: "hidden", justifySelf: "start" }),
          }}
        >
          {t(DOWNLOAD_THE_APP)}
        </span>
      )}
      <div
        data-download-toggle=""
        style={{ position: "relative", alignSelf: "end", height: 0, ...(stack ? { gridColumn: 1, gridRow: 1 + n } : { gridRow: 1, gridColumn: 1 + n }) }}
      >
        <div
          ref={hang}
          style={{ position: "absolute", top: 0, left: "50%", width: compact ? HANG_W_COMPACT : HANG_W, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          {win &&
            (compact ? (
              // The hero: the help line is read with the button, and shown in the panel.
              <p id={helpId} className="sr-only">
                {helpText(version)}
              </p>
            ) : (
              <p id={helpId} data-download-help="" style={{ ...HELP, marginTop: "8px", textAlign: "center" }}>
                {helpText(version)}{" "}
                <button
                  {...whyProps}
                  className="cl-hc"
                  style={{ display: "inline", padding: 0, font: "inherit", fontWeight: 600, color: "#5B5349", textDecoration: "underline", textUnderlineOffset: "2px", "--hc": "#6A54C4" } as React.CSSProperties}
                >
                  {t("Why?")}
                </button>
              </p>
            ))}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "12px" }}>
            {win && compact && (
              <button {...whyProps} className="cl-hc cl-uline" style={SMALL_LINK}>
                {t("Install help")}
              </button>
            )}
            {!compact && otherLink}
            <button
              ref={listToggle}
              type="button"
              aria-expanded={listOpen}
              aria-controls={listId}
              data-download-platforms=""
              onClick={() => {
                openFrom(listToggle.current);
                setListOpen(!listOpen);
              }}
              onKeyDown={onListToggleKey}
              className="cl-hc cl-uline"
              style={SMALL_LINK}
            >
              {t("Other platforms")}
            </button>
            {/* The hero: last, so a narrow screen wraps it first (it is also in the list). */}
            {compact && otherLink}
          </div>
        </div>
      </div>
      {extra > 0 && <div aria-hidden data-download-room="" style={{ gridColumn: 1, gridRow: stack ? 3 : 2, height: `${Math.max(0, extra - 12)}px` }} />}
      {host &&
        createPortal(
          <ul
            ref={listPanel}
            id={listId}
            data-download-list=""
            hidden={!listOpen}
            onKeyDown={onListKey}
            style={{ ...CARD, listStyle: "none", padding: "8px", minWidth: "240px", animation: enter }}
          >
            {rows.map((p) => (
              <li key={p.id}>
                {p.option ? (
                  <>
                    <a href={p.option.href} className="cl-hbg cl-hc" style={LINK_ROW}>
                      <span style={{ color: "#221E1A" }}>{t(p.name)}</span>
                      <span className="sr-only">, </span>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{t(p.option.label)}</span>
                    </a>
                    {p.option.other && (
                      // Windows: the other architecture's installer, under its row.
                      <a href={p.option.other.href} className="cl-hbg cl-hc" style={{ ...LINK_ROW, padding: "6px 12px", fontSize: "13px", fontWeight: 500 }}>
                        <span className="sr-only">{t(p.name)}, </span>
                        {t("Other download ({arch})", { arch: ARCH[p.option.other.arch] })}
                      </a>
                    )}
                  </>
                ) : (
                  // No link yet: plain text, read as "Mac, Coming soon".
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
      {host &&
        win &&
        createPortal(
          <div
            ref={whyPanel}
            id={whyId}
            role="region"
            aria-labelledby={`${whyId}-h`}
            tabIndex={-1}
            data-download-why-panel=""
            hidden={!whyOpen}
            onKeyDown={onWhyKey}
            style={{ ...CARD, width: "360px", padding: "16px", fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "#5B5349", outline: "none", animation: enter }}
          >
            <WhyBody id={`${whyId}-h`} lead={compact ? helpText(version) : null} sums={sums} />
          </div>,
          host,
        )}
    </>
  );
};

/** The desktop panel's caption: what the download is, with the version when versions.json answered. */
const desktopCaption = (version: string | null) =>
  version ? t("Windows 10 and 11 · Free · About 2 MB · Version {v}", { v: version }) : t("Windows 10 and 11 · Free · About 2 MB");

const CLOSE_MS = 160;

/** The chevron on the desktop toggle: turns when the panel is open. */
const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    aria-hidden
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: reducedMotion() ? "none" : "transform .2s cubic-bezier(.22,1,.36,1)" }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** A link-styled row in the desktop panel's list (the platform list's rows, smaller). */
const PANEL_ITEM = {
  ...LINK_ROW,
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px 10px",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: 600,
  font: "inherit",
  textAlign: "start",
  cursor: "pointer",
} as React.CSSProperties;

/**
 * Desktop (1024px and wider, or a computer at any width): "Download the app" opens one panel under it,
 * anchored, centred on the button and kept on screen (anchoredPanel.ts), in
 * the panels' card with the button's hairline lavender border. It closes on
 * Escape (focus back on the button), a click outside or on the button, with a
 * short fade and slide (none with reduced motion).
 */
const DesktopDownload: React.FC<{
  option: NonNullable<ReturnType<typeof downloadOption>>;
  rows: ReturnType<typeof platformList>;
  version: string | null;
  btnStyle: React.CSSProperties;
  stack: boolean;
}> = ({ option, rows, version, btnStyle, stack }) => {
  const [open, setOpenState] = useState(false);
  const [closing, setClosing] = useState(false);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [sums, setSums] = useState<Checksum[]>([]);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const setOpen = (v: boolean) => {
    window.clearTimeout(timer.current);
    if (v) {
      setClosing(false);
      setOpenState(true);
      return;
    }
    setOpenState(false);
    if (reducedMotion()) return;
    setClosing(true);
    timer.current = window.setTimeout(() => setClosing(false), CLOSE_MS);
  };
  const { toggle, panel, onToggleKey, onPanelKey } = useAnchoredPanel<HTMLDivElement>(open, setOpen, { relayout: `${helpOpen}${listOpen}${started}${sums.length}${version}`, below: true });
  const panelId = useId();
  const titleId = useId();
  const helpId = useId();
  const listId = useId();
  const win = option.id === "windows";

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (helpOpen) void readWindowsSums(version).then(setSums);
  }, [helpOpen, version]);
  // A fresh panel each time it opens: no confirmation, sections folded.
  const onToggle = () => {
    if (!open) {
      setHost(toggle.current?.closest<HTMLElement>(".centium-site") ?? document.body);
      setStarted(false);
      setHelpOpen(false);
      setListOpen(false);
    }
    setOpen(!open);
  };
  const start = () => setStarted(true);
  const anim = reducedMotion() ? "none" : open ? "centium-menu-in .2s cubic-bezier(.22,1,.36,1) both" : "centium-menu-out .16s ease both";
  const shown = open || closing;
  const linkBtn = { display: "inline", padding: 0, font: "inherit", fontWeight: 600, color: "#5B5349", textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer", "--hc": "#6A54C4" } as React.CSSProperties;

  return (
    <>
      <button
        ref={toggle}
        type="button"
        data-download=""
        data-download-desktop=""
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={onToggle}
        onKeyDown={onToggleKey}
        className="cl-lift"
        style={{ ...btnStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", font: "inherit", fontWeight: btnStyle.fontWeight, fontSize: btnStyle.fontSize, cursor: "pointer", ...(stack ? { gridColumn: 1, gridRow: 2 } : { gridRow: 1, gridColumn: 2 }) }}
      >
        {t(option.label)}
        <Chevron open={open} />
      </button>
      {host &&
        createPortal(
          <div
            ref={panel}
            id={panelId}
            role="dialog"
            aria-labelledby={titleId}
            data-download-panel=""
            hidden={!shown}
            onKeyDown={onPanelKey}
            style={{ ...CARD, width: "340px", padding: "16px", border: "1px solid rgba(125,103,217,.22)", boxShadow: "0 12px 32px rgba(72,58,130,.14)", fontSize: "13px", lineHeight: "20px", fontWeight: 500, color: "#5B5349", animation: anim, pointerEvents: open ? undefined : "none" }}
          >
            <h2 id={titleId} className="sr-only">
              {t(option.label)}
            </h2>
            <p role="status" data-download-started="" style={{ margin: started ? "0 0 10px" : 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: "#1D744A" }}>
              {started && (
                <>
                  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {t("Your download has started")}
                </>
              )}
            </p>
            <a
              href={option.href}
              onClick={start}
              data-download-primary=""
              className="cl-lift"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "44px", padding: "0 16px", borderRadius: "999px", background: "#775FD7", color: "#fff", fontWeight: 600, fontSize: "14px", transition: "transform .25s cubic-bezier(.22,1,.36,1)" }}
            >
              {win ? t("Download for Windows") : t(option.label)}
            </a>
            {win && (
              <>
                <p data-download-caption="" style={{ margin: "10px 0 0", fontSize: "12px", lineHeight: "18px", color: "#71685E", textAlign: "center" }}>
                  {desktopCaption(version)}
                </p>
                <p data-download-note="" style={{ margin: "8px 0 0", fontSize: "12px", lineHeight: "18px", color: "#5B5349" }}>
                  {t('Windows may show "Windows protected your PC". Choose More info, then Run anyway.')}{" "}
                  <button type="button" aria-expanded={helpOpen} aria-controls={helpId} data-download-why="" onClick={() => setHelpOpen(!helpOpen)} className="cl-hc" style={linkBtn}>
                    {t("Why?")}
                  </button>
                </p>
              </>
            )}
            <hr aria-hidden style={{ margin: "12px 0 6px", border: 0, borderTop: "1px solid rgba(125,103,217,.16)" }} />
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {win && option.other && (
                <li>
                  <a href={option.other.href} onClick={start} data-download-other="" className="cl-hbg cl-hc" style={PANEL_ITEM}>
                    {t("Other download ({arch})", { arch: ARCH[option.other.arch] })}
                  </a>
                </li>
              )}
              <li>
                <button type="button" aria-expanded={listOpen} aria-controls={listId} data-download-platforms="" onClick={() => setListOpen(!listOpen)} className="cl-hbg cl-hc" style={PANEL_ITEM}>
                  {t("Other platforms")}
                  <Chevron open={listOpen} />
                </button>
                <ul id={listId} hidden={!listOpen} data-download-list="" style={{ listStyle: "none", margin: "2px 0 4px", padding: 0, paddingInlineStart: "8px" }}>
                  {rows.map((p) => (
                    <li key={p.id}>
                      {p.option ? (
                        <a href={p.option.href} onClick={start} className="cl-hbg cl-hc" style={{ ...LINK_ROW, padding: "6px 10px", fontSize: "13px" }}>
                          <span style={{ color: "#221E1A" }}>{t(p.name)}</span>
                          <span className="sr-only">, </span>
                          <span style={{ fontSize: "12px", fontWeight: 500 }}>{t(p.option.label)}</span>
                        </a>
                      ) : (
                        <div style={{ ...ROW, padding: "6px 10px", fontSize: "13px" }}>
                          <span style={{ color: "#221E1A" }}>{t(p.name)}</span>
                          <span className="sr-only">, </span>
                          <span style={{ fontSize: "12px", fontWeight: 500 }}>{t(COMING_SOON)}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
              {win && (
                <li>
                  <button type="button" aria-expanded={helpOpen} aria-controls={helpId} data-download-install-help="" onClick={() => setHelpOpen(!helpOpen)} className="cl-hbg cl-hc" style={PANEL_ITEM}>
                    {t("Install help")}
                    <Chevron open={helpOpen} />
                  </button>
                </li>
              )}
            </ul>
            {win && (
              <div id={helpId} hidden={!helpOpen} data-download-help-panel="" style={{ margin: "8px 0 0", padding: "12px", borderRadius: "12px", background: "#F7F5FC" }}>
                <WhyBody id={`${helpId}-h`} lead={null} sums={sums} />
              </div>
            )}
          </div>,
          host,
        )}
    </>
  );
};

const P: React.CSSProperties = { margin: "8px 0 0" };

/** The "Why?" help: the two warnings, Smart App Control, updates, checksums;
 *  in the hero ("Install help") the help line first. */
const WhyBody: React.FC<{ id: string; lead: string | null; sums: Checksum[] }> = ({ id, lead, sums }) => (
  <>
    {lead && <p style={{ ...HELP, fontSize: "13px", lineHeight: "20px", margin: "0 0 12px" }}>{lead}</p>}
    <h3 id={id} style={{ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: "#221E1A" }}>
      {t("Why Windows warns")}
    </h3>
    <p style={P}>{t("Centium's Windows app isn't signed with a code-signing certificate yet, so Windows doesn't know who published it and treats it as a new app.")}</p>
    <ol style={{ margin: "8px 0 0", paddingInlineStart: "20px", listStyleType: "decimal" }}>
      <li>{t('Edge or Chrome may say the file "isn\'t commonly downloaded". Choose Keep.')}</li>
      <li style={{ marginTop: "4px" }}>{t('When you open it, Windows may say "Windows protected your PC", with the publisher shown as "Unknown publisher". Choose More info, then Run anyway.')}</li>
    </ol>
    <p style={P}>{t("On a new Windows 11 PC with Smart App Control on, Windows blocks apps that aren't signed, with no way to run them anyway. There, use Get Started to open Centium in your browser.")}</p>
    <p style={P}>{t("After that, Centium updates itself, without the warning.")}</p>
    {sums.length > 0 && (
      <div data-download-sums="">
        <p style={P}>{t("SHA-256 checksums, to check the file:")}</p>
        {sums.map((s) => (
          <p key={s.file} dir="ltr" style={{ margin: "4px 0 0", fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace", fontSize: "11px", lineHeight: "16px", overflowWrap: "anywhere", textAlign: "start" }}>
            <span style={{ fontWeight: 600, color: "#221E1A" }}>{ARCH[s.arch]}</span> {s.sha256}
          </p>
        ))}
      </div>
    )}
  </>
);

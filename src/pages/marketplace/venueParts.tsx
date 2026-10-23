import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Copy, MapPin, Navigation } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// Pieces the class page (MO1.4.4) and the gym page (MO1.4.2.1 / .s) share
// (v6 Part B "Hero pages": the hero scrolls away and a compact header takes
// over once the name has passed under the top edge).

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * The hero's no-photo picture (MO1.4.2.1 #1-6, MO1.4.4 #1-6): a base, white
 * 2 pt stripes every 46 pt, a lower band and three blocks. A drawing, so it
 * keeps its literal colours in dark mode too (O-DARK); only the drawn dark
 * values change (stripes #FFFFFF@8%, blocks #F5F3FA, i.e. charcoal in dark).
 * Geometry is the frame's (390 wide), measured from the hero's foot so the
 * safe area above never moves it.
 */
const HERO_GEOMETRY = {
  // W2 gym detail (C-MO.4.2.1, a 180 hero): the 240 drawing scaled to 0.75
  // tall (band 68.4; blocks end 53.9 above the foot), the widths kept.
  180: {
    band: 68.4,
    blocks: [
      { left: 46.8, bottom: 53.9, width: 70.2, height: 39.6, alpha: 35 },
      { left: 171.6, bottom: 53.9, width: 101.4, height: 6, alpha: 45 },
      { left: 312, bottom: 53.9, width: 39, height: 61.2, alpha: 30 },
    ],
  },
} as const;

export const GYM_HERO = { base: "#5A5368", band: "#8E8496" } as const;

export function HeroPlaceholder({ height, base, band }: { height: 180; base: string; band: string }) {
  const g = HERO_GEOMETRY[height];
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" style={{ background: base }} data-hero-placeholder="">
      <div
        className="absolute inset-0 [--hero-stripe:rgba(255,255,255,0.06)] dark:[--hero-stripe:rgba(255,255,255,0.08)]"
        style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--hero-stripe) 0 2px, transparent 2px 46px)" }}
      />
      <div className="absolute inset-x-0 bottom-0" style={{ height: g.band, background: band }} />
      {g.blocks.map((b) => (
        <span
          key={b.left}
          className={`absolute rounded-[4px] ${
            b.alpha === 35 ? "bg-charcoal/35" : b.alpha === 45 ? "bg-charcoal/45" : "bg-charcoal/30"
          } [html.high-contrast_&]:bg-charcoal/30`}
          style={{ left: b.left, bottom: b.bottom, width: b.width, height: b.height }}
        />
      ))}
    </div>
  );
}

/**
 * MO1.4.2.1 #9-10 (PB-O-56, B13 MK-03): the hero's photos side by side,
 * swiped with scroll snapping, and the pager centred 12 above the hero's
 * foot: the current photo a 16 × 6 pill, the others 6 × 6 dots, 5 apart,
 * r9999; pill #FFFFFF (dark #1C1F28, the card colour), dots #FFFFFF@55%
 * (the frame's dark #FFFFFF@8% is flagged *: kept at 55%). Hidden with one
 * photo. A photo that fails to load drops out; with none left the
 * placeholder underneath shows.
 */
export function HeroGallery({ photos }: { photos: string[] }) {
  const [failed, setFailed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const list = photos.filter((u) => !failed.includes(u));
  const at = Math.min(index, Math.max(0, list.length - 1));
  if (list.length === 0) return null;
  return (
    <>
      <div
        data-hero-gallery=""
        className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
          if (i !== index) setIndex(i);
        }}
      >
        {list.map((u) => (
          <img
            key={u}
            src={u}
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable={false}
            onError={() => setFailed((f) => (f.includes(u) ? f : [...f, u]))}
            className="w-full h-full shrink-0 snap-start object-cover"
          />
        ))}
      </div>
      {list.length > 1 && (
        <div aria-hidden data-photo-pager="" className="absolute inset-x-0 bottom-3 flex justify-center gap-[5px] pointer-events-none">
          {list.map((u, i) => (
            <span key={u} className={`h-1.5 rounded-full ${i === at ? "w-4 bg-cream-card" : "w-1.5 bg-white/55"}`} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * The compact header's state (MO1.4.2.1.s S1, MO1.4.4 S1): shown once the
 * hero name has passed under the header's bottom edge, watched by an
 * IntersectionObserver whose root is shrunk by the header's measured height
 * (68, 70 at Larger text, plus the safe area). Callback refs, because the
 * name only mounts once the page has loaded.
 */
export function useCompactHeader() {
  const [nameEl, setNameEl] = useState<HTMLElement | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  const [headerH, setHeaderH] = useState(68);

  useLayoutEffect(() => {
    if (!headerEl) return;
    const write = () => setHeaderH(headerEl.offsetHeight || 68);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(headerEl);
    return () => ro.disconnect();
  }, [headerEl]);

  useEffect(() => {
    if (!nameEl) return;
    const io = new IntersectionObserver(
      ([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < headerH),
      { rootMargin: `${-Math.round(headerH)}px 0px 0px 0px`, threshold: [0, 1] }
    );
    io.observe(nameEl);
    return () => io.disconnect();
  }, [nameEl, headerH]);

  return { setNameEl, setHeaderEl, shown, headerH };
}

/**
 * MO1.4.2.1.s #23-26: the compact header. Fixed over the app column, 68 tall
 * plus the safe area (70 at Larger text), pad 0 16 8 8, fill #FFFFFF /
 * #121317 (--c-cream, V6-91, so there is no seam with the page); a plain 36
 * back button (no disc) with ChevronLeft 20 in #5B5349 / #B8B3C7, gap 4, the
 * name 17/36 700 ls -0.3, one line with an ellipsis. It fades in over 150 ms
 * (none under Reduce motion); while hidden it is aria-hidden, inert and takes
 * no pointer events, so the hero's back is the reachable one. `hairline`:
 * 1 px #241F1B@8% / #F5F3FA@10% (V6-91) under it; the gym page turns it off
 * while its tabs are pinned (one hairline, under the tabs). Portaled, z-30:
 * over the page and its pinned tabs, under sheets and popups (z-50).
 */
export function CompactHeader({
  title,
  onBack,
  shown,
  hairline,
  headerRef,
}: {
  title: string;
  onBack: () => void;
  shown: boolean;
  hairline: boolean;
  headerRef: (el: HTMLDivElement | null) => void;
}) {
  const reduced = useReducedMotion();
  return createPortal(
    <div
      ref={headerRef}
      data-compact-header=""
      data-shown={shown ? "true" : "false"}
      aria-hidden={!shown}
      inert={!shown}
      className="fixed top-0 z-30 left-[var(--app-gutter,0px)] right-[var(--app-gutter,0px)] bg-cream"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 24px)",
        paddingRight: 16,
        paddingBottom: 8,
        paddingLeft: 8,
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        transition: reduced ? "none" : "opacity 150ms ease",
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          tabIndex={shown ? 0 : -1}
          className="tap relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-charcoal-soft before:content-[''] before:absolute before:-inset-1"
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden />
        </button>
        <p className="m-0 min-w-0 flex-1 truncate text-[17px] leading-[36px] font-bold tracking-[-0.3px] text-charcoal">{title}</p>
      </div>
      {hairline && <span aria-hidden data-compact-hairline="" className="absolute inset-x-0 bottom-0 h-px bg-hair-08 dark:bg-hair-10" />}
    </div>,
    document.body
  );
}

/**
 * `label.section` as the detail pages draw it (MO1.4.2.1 #25, MO1.4.4 #25):
 * 10.5/15.8 700 uppercase, ls 1.3px, in #7D67D9 / #9A8CD6, no rule. Callers
 * give the 22 above it and the 8 under it.
 */
export function DetailLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`m-0 text-[10.5px] font-bold uppercase tracking-[1.3px] leading-[15.8px] text-th-7d67d9 dark:text-primary-accent ${className ?? ""}`}>
      {children}
    </h2>
  );
}

/**
 * The Location card (MO1.4.2.1 #37-41, MO1.4.4 #29-33): 358 × 120, r16, the
 * map fill #EEF1EF (dark: the soft surface, O3) with a grid of white /
 * #1C1F28 lines at full opacity: rows 28 + 5 (from the foot, the table's
 * 0deg gradient), columns 49 with a 5 line (measured, the table truncates
 * it); a 9 tall road band 54 from the top; MapPin 28 in #7D67D9 / #9A8CD6,
 * centred across, its top 38 down (tip on the road). The address 8 under it,
 * 12.5/18.8 400 #5B5349 / #B8B3C7. A drawing, not a map. With `onOpen` the
 * card is a button (MO1.4.4 S3: the Directions menu).
 */
export function MapCard({
  address,
  onOpen,
}: {
  address: string | null;
  onOpen?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const card = <MapDrawing className="h-[120px] rounded-2xl" />;
  return (
    <div className="flex flex-col gap-2">
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-haspopup="menu" aria-label={address ? `Directions to ${address}` : "Directions"} className="tap block w-full text-start rounded-2xl">
          {card}
        </button>
      ) : (
        <div aria-hidden="true">{card}</div>
      )}
      {address && <p className="m-0 text-[12.5px] leading-[18.8px] text-charcoal-soft">{address}</p>}
    </div>
  );
}

/**
 * MapCard's drawing on its own (the grid, the road and the pin), sized by the
 * caller: MapCard draws it 120 tall r16; the gym page (C-MO.4.2.1) draws it
 * 96 tall at the top of its "Location and hours" card, in place of the
 * board's MAP placeholder (D-52).
 */
export function MapDrawing({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`relative block overflow-hidden bg-[#EEF1EF] dark:bg-cream-soft ${className}`} style={style} data-map-card="">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--c-cream-card)) 0 5px, transparent 5px), repeating-linear-gradient(0deg, transparent 0 28px, rgb(var(--c-cream-card)) 28px 33px)",
          backgroundSize: "49px 100%, 100% 100%",
          backgroundPosition: "-4px 0, 0 0",
        }}
      />
      <span aria-hidden className="absolute inset-x-0 top-[54px] h-[9px] bg-cream-card" data-map-road="" />
      <MapPin
        size={28}
        strokeWidth={2}
        aria-hidden
        className="absolute left-1/2 top-[38px] -translate-x-1/2 text-th-7d67d9 dark:text-primary-accent"
      />
    </span>
  );
}

/**
 * MO1.4.2.4 Directions (BR-08): the menu under its anchor: Apple Maps (iPhone
 * only), Google Maps, Copy address; no Waze. The destination is the venue's
 * coordinates when it has them, else its address. Shared by the gym page's
 * Directions button and the class page's Location card (MO1.4.4 S3).
 */
export function DirectionsMenu({
  open,
  onClose,
  anchor,
  address,
  coords,
  onCopied,
  onMapOpen,
}: {
  open: boolean;
  onClose: () => void;
  anchor: HTMLElement | null;
  address: string | null;
  coords: { lat: number; lng: number } | null;
  onCopied: (note: string) => void;
  /** B13 MK-07: a maps app was opened for the venue (map_open). */
  onMapOpen?: () => void;
}) {
  const dest = coords ? `${coords.lat},${coords.lng}` : (address ?? "");
  type Dir = "apple" | "google" | "copy";
  const pick = (d: Dir) => {
    if (d === "copy") {
      if (!address) return;
      void navigator.clipboard?.writeText(address).then(
        () => onCopied("Address copied"),
        () => undefined
      );
      return;
    }
    onMapOpen?.();
    const q = encodeURIComponent(dest);
    const url = d === "apple" ? `https://maps.apple.com/?daddr=${q}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <PopupMenu<Dir>
      open={open}
      onClose={onClose}
      anchor={anchor}
      align="left"
      width={220}
      options={[
        ...(isIOS() ? [{ value: "apple" as const, label: "Apple Maps", icon: <Navigation size={15} strokeWidth={1.75} /> }] : []),
        { value: "google" as const, label: "Google Maps", icon: <Navigation size={15} strokeWidth={1.75} /> },
        ...(address ? [{ value: "copy" as const, label: "Copy address", note: address, icon: <Copy size={15} strokeWidth={1.75} /> }] : []),
      ]}
      onSelect={pick}
    />
  );
}

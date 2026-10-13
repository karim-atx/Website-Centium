import React from "react";
import { linePx, textPx } from "../../theme/textSize";
import { useApp } from "../../context/AppContext";

/**
 * Pieces shared by the Exercise Library sheet (WO1.3) and the Library tab
 * (WO2), so the two cannot drift apart.
 */

/**
 * The "Yours" tag after a custom exercise's name (WO1.3 #71, WO2 #24):
 * pad 3 7, r9999, 10/10 700, #7D6BB5 on #F0EDF9 (dark #C3B3FB on #303141).
 * It replaces the gold sparkle and the gold "YOURS" badge (do not build the
 * sparkle). High contrast: primary text #4B3BA0 (--c-primary-deep-text).
 */
export const YoursTag: React.FC = () => {
  const ink = useLibraryInk();
  return (
    <span
      className="shrink-0 inline-flex items-center bg-th-f0edf9 dark:bg-th-303141"
      style={{ padding: "3px 7px", borderRadius: 9999, fontSize: textPx(10), lineHeight: linePx(10), fontWeight: 700, color: ink }}
    >
      Yours
    </span>
  );
};

/**
 * The library's primary text ink (+ Add, Added, Create, Retry, Yours):
 * #7D6BB5 (the theme's ink twin) / dark #C3B3FB; High contrast the primary
 * text #4B3BA0 in Centium light (--c-primary-deep-text, which is #C3B3FB in
 * dark).
 */
export const useLibraryInk = (): string => {
  const { theme, accessibility } = useApp();
  if (accessibility.highContrast) return "rgb(var(--c-primary-deep-text))";
  return theme === "dark" ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))";
};

/**
 * Lower case without accents, for search (WO1.3 S2 / WO2 S6: case- and
 * accent-insensitive).
 */
export const searchKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * WO1.3 S2 / WO2 S6 (B3 PB-O-33): a search matches the name OR one of the
 * catalogue's aliases ("bench", "rdl", "ohp"), case- and accent-insensitive.
 * `query` is already a searchKey; an empty one matches everything.
 */
export const matchesSearch = (query: string, name: string, aliases?: readonly string[]) =>
  !query || searchKey(name).includes(query) || (aliases ?? []).some((a) => searchKey(a).includes(query));

/**
 * Loading rows (WO1.3 O2, WO2 O4): bars #F5F5F6 / #242730 that pulse 1.2 s,
 * static under Reduce motion (animate-skeleton-pulse).
 */
export const SkeletonRows: React.FC<{ count: number; height: number; divided?: boolean }> = ({ count, height, divided }) => (
  <div aria-hidden>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={`flex items-center ${divided && i > 0 ? "border-t-[0.5px] border-charcoal/[0.08]" : ""}`}
        style={{ height, padding: "0 4px", gap: 10 }}
      >
        <span className="animate-skeleton-pulse bg-cream-soft rounded-full" style={{ height: 12, width: `${48 - (i % 3) * 10}%` }} />
        <span className="flex-1" />
        <span className="animate-skeleton-pulse bg-cream-soft rounded-full" style={{ height: 10, width: 44 }} />
      </div>
    ))}
  </div>
);

/**
 * "Couldn't load exercises." with Retry (WO1.3 O3, WO2 O3): 13.5/700 ink and
 * a 12/700 Retry in #7D6BB5 / #C3B3FB. `card` draws it as WO2's card (r18,
 * 0.5px #241F1B@11%), else it sits in the list area as WO1.3's line.
 */
export const LoadErrorCard: React.FC<{ message: string; onRetry: () => void; card?: boolean }> = ({ message, onRetry, card }) => {
  const ink = useLibraryInk();
  return (
    <div
      role="alert"
      className={`flex items-center justify-between ${card ? "bg-cream-card" : ""}`}
      style={{
        gap: 10,
        padding: card ? "14px 16px" : "14px 4px",
        borderRadius: card ? 18 : undefined,
        border: card ? "0.5px solid var(--hair-11)" : undefined,
      }}
    >
      <span style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="tap relative shrink-0 before:absolute before:-inset-[12px] before:content-['']"
        style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: ink }}
      >
        Retry
      </button>
    </div>
  );
};

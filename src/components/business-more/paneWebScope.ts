import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useWebLayout } from "../web/useWebLayout";
import { secondaryLayoutFor } from "../web/webNav";

// Website viewport v1 · ST Settings Web: when the business kit draws the pane
// design (see paneWeb.tsx).

/**
 * "on": inside a pane frame (PaneFrame, or the client More's own pane), where
 * the kit draws the pane design. "off": inside a sheet or popup opened from a
 * pane page (the mobile kit look). "auto": anywhere else (mobile).
 */
export const PaneScope = createContext<"auto" | "off" | "on">("auto");

/** True when the kit draws the web pane design: 1024 and wider, inside a pane frame. */
export function usePaneWeb(): boolean {
  const scope = useContext(PaneScope);
  const { web } = useWebLayout();
  return web && scope === "on";
}

/**
 * True when a page should frame itself as a pane (BizPage, the business
 * Settings page): 1024 and wider, on a path the shell opens in its More or
 * Settings layout, not inside a sheet. Pages that don't frame themselves keep
 * their mobile look in the pane.
 */
export function usePaneEligible(): boolean {
  const scope = useContext(PaneScope);
  const { web } = useWebLayout();
  const { pathname } = useLocation();
  const { user } = useApp();
  if (scope === "off" || !web) return false;
  return secondaryLayoutFor(pathname, user.accountType === "business") !== null;
}

/** The pane's padding: 32 40 40 at 1440, 24 28 32 on the 1024 rail. */
export function usePanePad(): { top: number; x: number; bottom: number } {
  const { rail } = useWebLayout();
  return rail ? { top: 24, x: 28, bottom: 32 } : { top: 32, x: 40, bottom: 40 };
}

/** A person's initials for the pane avatar (two at most). */
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? "")
    .join("")
    .toUpperCase();

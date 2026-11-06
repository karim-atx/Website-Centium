import type { ProLane } from "../subtypeLanes";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-CL.1 / WP-CL.1 · NU / WP-CO-CL.1: how each
// client page tab places the repo's own cards on the web grid. The spans are
// the reference files' literal column sets (WP-CL Client Web v4 `spans`,
// WP-CL Nutrition Client Web and WP-CO Patient Web `C(s1440, s1024, …)`):
// each block is a column of cards with its span at 1440 and on the rail, and
// blocks flow left to right, wrapping to a new row as CSS grid would.
//
// The tab's cards are the repo's mobile components, so a block's cards are
// picked from the rendered list: a card that starts a section (its
// SectionHead h2, a tablist, a known button) chooses the block, and the cards
// after it follow until the next choice.

export interface TabBlock {
  /** Span at 1440 and at 1024 (the rail). */
  span: [number, number];
}

export interface TabItem {
  el: HTMLElement;
  /** The SectionHead label when the item is one. */
  head: string | null;
  /** The item's whole text, trimmed. */
  text: string;
  index: number;
}

export interface TabLayout {
  /** Grid columns at 1440 and on the rail. */
  grid: [number, number];
  blocks: TabBlock[];
  /** The block this item opens, or undefined to stay in the current block. */
  place: (item: TabItem, ctx: { heads: Set<string>; rail: boolean }) => number | undefined;
}

const B = (s1440: number, s1024: number): TabBlock => ({ span: [s1440, s1024] });
const startsWithT = (head: string | null, key: string) => !!head && head.startsWith(t(key).split("{")[0].trim());
const is = (head: string | null, key: string) => head === t(key);
const hasButton = (it: TabItem, key: string) => Array.from(it.el.querySelectorAll("button")).some((b) => b.textContent?.trim() === t(key)) || (it.el.tagName === "BUTTON" && it.text === t(key));

// --- Full coaching (WP-CL Client Web v4: a 12-column grid at both widths) ---

const fcOverview: TabLayout = {
  grid: [12, 12],
  // Filled: Graph | Shared + Activity | About + Habits, 4 + 4 + 4; on the
  // rail the graph is a band (tiles 40 %, the chart beside it), then 6 + 6.
  // New client: 7 + 5 (the banner, Shared with you | Next steps, About).
  blocks: [B(4, 5), B(4, 7), B(4, 6), B(4, 6), B(7, 7), B(5, 5)],
  place: (it, { heads, rail }) => {
    if (heads.has(t("Next steps"))) {
      if (it.index === 0) return 4;
      if (is(it.head, "Next steps")) return 5;
      return undefined;
    }
    if (it.index === 0) return 0;
    if (it.index === 1) return rail ? 1 : 0; // at 1440 the chart stacks under the tiles
    if (is(it.head, "Shared with you") || is(it.head, "Recent activity")) return 2;
    if (is(it.head, "About")) return 3;
    return undefined;
  },
};

const fcPlan: TabLayout = {
  grid: [12, 12],
  blocks: [B(7, 7), B(5, 5)],
  place: (it) => {
    if (it.index === 0) return 0;
    if (is(it.head, "Past programmes") || is(it.head, "Nutrition")) return 1;
    return undefined;
  },
};

const fcSessions: TabLayout = {
  grid: [12, 12],
  blocks: [B(7, 7), B(5, 5)],
  place: (it) => {
    if (it.index === 0 || is(it.head, "Past")) return 0;
    if (is(it.head, "Upcoming")) return 1;
    return undefined;
  },
};

const fcFiles: TabLayout = {
  grid: [12, 12],
  blocks: [B(7, 7), B(5, 5)],
  place: (it) => {
    if (it.index === 0) return 0;
    if (is(it.head, "Progress photos")) return 1;
    return undefined;
  },
};

/** Progress (all lanes): the web branch of ProgressTab tags its parts with data-wpcl. */
const progress = (grid: [number, number], blocks: TabBlock[], of: Record<string, number>): TabLayout => ({
  grid,
  blocks,
  place: (it) => {
    const part = it.el.getAttribute("data-wpcl");
    return part && part in of ? of[part] : undefined;
  },
});

// Full coaching: range + the open group 7 · insights + the other groups 5;
// nothing shared: 6 + 6 (Client Web v4 `spans = [6, 6]`).
const fcProgress = progress([12, 12], [B(7, 7), B(5, 5)], { range: 0, detail: 0, wins: 0, insights: 1, groups: 1 });
const fcProgressLocked = progress([12, 12], [B(6, 6), B(6, 6)], { range: 0, detail: 0, wins: 0, insights: 1, groups: 1 });

// Nutrition and Clinical overview: the range row across, the list 5 (3) and
// the open group 7 (5) with the wins under it.
const listDetailProgress = progress([12, 8], [B(12, 8), B(5, 3), B(7, 5)], { range: 0, early: 0, insights: 1, groups: 1, detail: 2, wins: 2 });

// --- Nutrition (WP-CL Nutrition Client Web: 12 columns, 8 on the rail) ---

const overview3: TabLayout = {
  grid: [12, 8],
  // Filled: numbers across, chart + About (+ Habits) 8 (5), Recent activity
  // + Shared with you 4 (3). New: banner + Next steps 8 (5), Shared + About 4 (3).
  blocks: [B(12, 8), B(8, 5), B(4, 3), B(8, 5), B(4, 3)],
  place: (it, { heads }) => {
    if (heads.has(t("Next steps"))) {
      if (it.index === 0 || is(it.head, "Next steps")) return 3;
      if (is(it.head, "Shared with you") || is(it.head, "About")) return 4;
      return undefined;
    }
    if (is(it.head, "Recent activity") || is(it.head, "Shared with you")) return 2;
    if (is(it.head, "About")) return 1;
    if (it.index === 0) return 0;
    if (it.index === 1) return 1;
    return undefined;
  },
};

const nuPlan: TabLayout = {
  grid: [12, 8],
  blocks: [B(8, 5), B(4, 3)],
  place: (it) => {
    if (it.index === 0) return 0;
    if (is(it.head, "Targets and journal")) return 1;
    return undefined;
  },
};

/** Notes with the tools beside the list: search, chips, Add a note and Change history 4 (3), the notes 8 (5). */
const notesBeside: TabLayout = {
  grid: [12, 8],
  blocks: [B(4, 3), B(8, 5)],
  place: (it) => {
    if (it.el.tagName === "LABEL" || it.el.getAttribute("role") === "tablist" || hasButton(it, "Add a note") || hasButton(it, "Change history")) return 0;
    return 1;
  },
};

// Sessions and Files for Nutrition are not drawn in the Nutrition file: the
// Full coaching sets, with the rail sets the Nutrition file uses for its own
// 7 + 5-like pairs (5 + 3).
const nuSessions: TabLayout = { ...fcSessions, grid: [12, 8], blocks: [B(7, 5), B(5, 3)] };
const nuFiles: TabLayout = { ...fcFiles, grid: [12, 8], blocks: [B(7, 5), B(5, 3)] };

// --- Clinical overview (WP-CO Patient Web: 12 columns, 8 on the rail) ---

const coCarePlan: TabLayout = {
  grid: [12, 8],
  // plan across · Goals + Monitoring 4 · Recommendations 4 · Follow-ups +
  // Linked notes 4 · Referrals 4 · Shared with 8 (on the rail 4 each).
  blocks: [B(12, 8), B(4, 4), B(4, 4), B(4, 4), B(4, 4), B(8, 4)],
  place: (it, { heads }) => {
    if (!heads.has(t("Goals")) && !heads.has(t("Follow-ups"))) return 0; // empty: one block
    if (it.index === 0) return 0;
    if (is(it.head, "Goals") || is(it.head, "Monitoring")) return 1;
    if (startsWithT(it.head, "Recommendations for {firstName}")) return 2;
    if (is(it.head, "Follow-ups") || is(it.head, "Linked notes")) return 3;
    if (is(it.head, "Referrals") || is(it.head, "Dietary needs")) return 4;
    if (startsWithT(it.head, "Shared with {firstName}")) return 5;
    return undefined;
  },
};

const across: TabLayout = { grid: [12, 8], blocks: [B(12, 8)], place: () => 0 };

const coAppointments: TabLayout = {
  grid: [12, 8],
  blocks: [B(12, 8), B(6, 4), B(6, 4)],
  place: (it) => {
    if (it.index === 0) return 0;
    if (is(it.head, "Upcoming")) return 1;
    if (is(it.head, "Past")) return 2;
    return undefined;
  },
};

/**
 * The layout for a tab, or "notes-row" for the Full coaching notes (one
 * block: the toolbar row search 4fr | chips 5fr | Add, the notes 2 across).
 */
export function tabLayoutFor(lane: ProLane, tab: string, locked: boolean): TabLayout | "notes-row" {
  if (lane === "full_coaching") {
    if (tab === "overview") return fcOverview;
    if (tab === "plan") return fcPlan;
    if (tab === "progress") return locked ? fcProgressLocked : fcProgress;
    if (tab === "sessions") return fcSessions;
    if (tab === "notes") return "notes-row";
    return fcFiles;
  }
  if (lane === "nutrition") {
    if (tab === "overview") return overview3;
    if (tab === "plan") return nuPlan;
    if (tab === "progress") return listDetailProgress;
    if (tab === "sessions") return nuSessions;
    if (tab === "notes") return notesBeside;
    return nuFiles;
  }
  if (tab === "overview") return overview3;
  if (tab === "care-plan") return coCarePlan;
  if (tab === "trends") return listDetailProgress;
  if (tab === "appointments") return coAppointments;
  if (tab === "notes") return notesBeside;
  return across;
}

/**
 * Places the items: blocks flow left to right and wrap as grid
 * auto-placement does (24 between rows); a block's items stack in its
 * column, `gaps[i]` above item i. Returns each item's grid area (1-based
 * lines; rows are 1px tracks).
 */
export function placeBlocks(
  cols: number,
  spans: number[],
  members: number[][],
  heights: number[],
  gaps: number[],
): { col: number; span: number; row: number; rows: number }[] {
  const out: { col: number; span: number; row: number; rows: number }[] = [];
  let cursor = 0;
  let rowTop = 1;
  let rowBottom = 1;
  spans.forEach((raw, b) => {
    const items = members[b];
    if (!items.length) return;
    const span = Math.min(raw, cols);
    if (cursor + span > cols) {
      cursor = 0;
      rowTop = rowBottom + 24;
    }
    let y = rowTop;
    items.forEach((i, k) => {
      if (k > 0) y += Math.max(0, Math.round(gaps[i]));
      const h = Math.max(1, Math.ceil(heights[i]));
      out[i] = { col: cursor + 1, span, row: y, rows: h };
      y += h;
    });
    rowBottom = Math.max(rowBottom, y);
    cursor += span;
  });
  return out;
}

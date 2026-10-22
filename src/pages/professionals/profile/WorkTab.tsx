import React from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { TicketStub } from "../../../components/market/TicketStub";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { stubColors, type StubTone } from "../../../components/market/marketColor";
import { initialsOf } from "../../../components/market/peopleModel";
import { sortWork, workDates, workRoleLine, workStub, type WorkEntry } from "../../../services/pro-profile/model";
import { EmptyBlock } from "./parts";

// Market + Share 3.0 · W5 · C-MO.4.9 `proWork` / `proWorkEmpty` (Client
// Professional Screens lines 118–132, 150–156; P-MA.2 uses the same entry).
// Literal values: a column (margin-top 14, gap 10) of tickets: relative,
// min-height 88, radius 18, --card, 0.5px --hair; the body (padding 12 14,
// gap 12): the 44 tile (radius 12, --pale, the gym's initials 12.5 / 800
// --accent), the gym 12 / 600 --accent, "{role} · Role" 14 / 19 700, the
// dates 11.5 --faint (margin-top 1); the 46 stub (1.5px dashed) with the
// vertical label 9.5 / 800 / 0.1em uppercase: "Role" (step 4 #E6F1EF /
// #4F8F8A), "Class slot" (#EEEAF8 / #7D67D9, dashes #AEA1DC), "Ended"
// (--soft / --faint, dashes --border); the two 14 notches at right 39.
// Dates month first (D-02): "Mar 2026 to now", "Jan to Jun 2025",
// "Sep 12, 2026".
//
// DB10 pending ≠ empty: until professional_public_profile answers, the tab
// shows a quiet line in the empty state's type, never "No Centium work
// history yet" (which would be a claim) and never sample rows.

export type WorkState = { kind: "loading" } | { kind: "pending" } | { kind: "error" } | { kind: "ready"; entries: WorkEntry[] };

export const WorkTab: React.FC<{ state: WorkState; firstName: string; today: string; onRetry: () => void }> = ({ state, firstName, today, onRetry }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const who = firstName || "This professional";
  if (state.kind === "loading") return <MarketSkeleton radius={18} rows={3} height={88} count={2} label="Loading work history" style={{ marginTop: 14 }} />;
  if (state.kind === "error") return <MarketError thing="work history" onRetry={onRetry} style={{ marginTop: 14 }} />;
  if (state.kind === "pending") {
    return (
      <p role="status" style={{ margin: 0, padding: "40px 24px 0", textAlign: "center", fontSize: textPx(13), lineHeight: linePx(20.15), color: m.faint }}>
        Roles and classes {who} is hired for through Centium will show here soon.
      </p>
    );
  }
  if (state.entries.length === 0) {
    return <EmptyBlock title="No Centium work history yet" body={`Roles and classes ${who} is hired for through Centium will show here, with each gym's name.`} />;
  }
  const tone = (stub: "Role" | "Class slot" | "Ended"): StubTone =>
    stub === "Role" ? 4 : stub === "Ended" ? "muted" : dark ? 1 : { ...stubColors(1, m, false), perf: m.fill };
  return (
    <ul aria-label="Work history" style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, lineHeight: "normal" }}>
      {sortWork(state.entries, today).map((w) => {
        const stub = workStub(w, today);
        const c = stubColors(tone(stub), m, dark);
        return (
          <li key={w.id}>
            <TicketStub stubWidth={46} vertical stubLabel={stub} tone={c} minHeight={88} bodyStyle={{ padding: "12px 14px", display: "flex", gap: 12 }}>
              <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(12.5), fontWeight: 800, color: m.accent, flexShrink: 0 }}>
                {initialsOf(w.businessName)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{w.businessName}</span>
                <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700, lineHeight: linePx(19), color: m.ink, overflowWrap: "anywhere" }}>{workRoleLine(w)}</span>
                <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>{workDates(w, today)}</span>
              </span>
            </TicketStub>
          </li>
        );
      })}
    </ul>
  );
};

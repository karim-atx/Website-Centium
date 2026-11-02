import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../../components/market/usePress";
import { initialsOf } from "../../../../components/market/peopleModel";
import { NO_ICON_SCALE } from "../../../../components/pro/proInk";
import { useBack } from "../../../../hooks/useBack";
import { useIsDark } from "../../../../hooks/useIsDark";
import { fetchMyWork, type WorkItem } from "../../../../services/team-hiring";
import { BackHeader, CapsLabel, lh, px, useMarketColors } from "../../../business-market/listingParts";
import { InitialsTile, OpEmpty, PaleNote } from "./parts";
import { fixedInk, fixedPair } from "./colours";
import { useActionStrip } from "./useActionStrip";
import { calendarLine, hiredWorkStrip, sinceLine, workClassRow, workPay } from "./opportunitiesModel";
import { t, tk, isRtl } from "../../../../i18n/core";

// The work tags (my_work tag values), shown through t().
void [tk("NEW"), tk("HIRED"), tk("SLOT")];

// Market + Share 3.0 · W4 · P-MA.5.3 My work
// (/app/pro/marketplace/opportunities/work; Professional Marketplace Screens
// lines 446–479 and the `W()`, `myWork` script; frame-check P-MA.5.3 Roles
// and classes · linked to Calendar / Empty). The back header "Opportunities /
// My work"; the pale note "Clients see you as the instructor on these
// classes, with your photo and profile."; the cards (margin-top 12, gap 12;
// radius 20, --card, 1px --border, the newest hire 1.5px #4F8F8A): the 44
// initials tile, the gym 12 / 600 --accent, the role 15 / 800 / 20, the since
// line 11.5 --faint, the tag (NEW #EBF2F4 / #5A859E, HIRED #E6F1EF / #4F8F8A,
// SLOT #EEEAF8 / #7D67D9; 10 / 800 0.08em, radius 999, padding 3 8); the caps
// "Assigned classes" (a slot: "Class"); each class row (padding 10 16, 0.5px
// --div between): the 52 --pale tile (time 13 / 800, day 9.5 / 700 --faint),
// the class 13.5 / 700 and its line 11.5 --faint; the Calendar link
// (12.5 / 800 --pdark, the 15 calendar glyph, the 14 chevron) "In your
// Calendar · N sessions a week" → /app/pro/calendar; "Pay, arranged with the
// gym" and the pay (12, 800). Arriving from a hire, the strip "You're hired ·
// {gym} starts {date}". my_work is DB8: pending, the drawn empty state.

const HOME = "/app/pro/marketplace";
type State = { status: "loading" } | { status: "pending" } | { status: "error" } | { status: "ok"; list: WorkItem[] };

const TAG: Record<WorkItem["tag"], [string, string]> = { NEW: ["#EBF2F4", "#5A859E"], HIRED: ["#E6F1EF", "#4F8F8A"], SLOT: ["#EEEAF8", "#7D67D9"] };

export default function MyWorkPage() {
  const m = useMarketColors();
  const navigate = useNavigate();
  const location = useLocation();
  const back = useBack(`${HOME}/opportunities`);
  const [state, setState] = useState<State>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [strip, showStrip] = useActionStrip();
  const retry = useCallback(() => setTick((n) => n + 1), []);
  const hired = (location.state as { hired?: { gym: string; startsOn: string | null } } | null)?.hired ?? null;
  const shown = useRef(false);

  useEffect(() => {
    if (!hired || shown.current) return;
    shown.current = true;
    showStrip(hiredWorkStrip(hired.gym, hired.startsOn, new Date()));
    navigate(location.pathname, { replace: true, state: null });
  }, [hired, showStrip, navigate, location.pathname]);

  useEffect(() => {
    let alive = true;
    // my_work + my_calendar (Database Release 2).
    void fetchMyWork().then((r) => {
      if (!alive) return;
      setState(r.ok ? { status: "ok", list: r.value } : r.pending ? { status: "pending" } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const now = new Date();

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow={t("Opportunities")} title={t("My work")} onBack={back} backLabel={t("Back to Opportunities")} />
      <MarketOffline loaded={state.status === "ok"} onRetry={retry} style={{ marginBottom: 12 }} />
      {state.status === "loading" ? (
        <MarketSkeleton radius={20} rows={4} count={2} height={260} gap={12} label={t("Loading your work")} />
      ) : state.status === "error" ? (
        <MarketError thing={t("your work")} onRetry={retry} />
      ) : state.status === "pending" || state.list.length === 0 ? (
        <OpEmpty icon="calendar" top={56} title={t("No work yet")} body={t("When a gym hires you, the role or class slot shows here with its schedule and assigned classes.")} cta={t("Browse openings")} onCta={() => navigate(`${HOME}/opportunities`)} />
      ) : (
        <>
          <PaleNote>{t("Clients see you as the instructor on these classes, with your photo and profile.")}</PaleNote>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {state.list.map((w) => (
              <WorkCard key={w.hireId} w={w} now={now} onCalendar={() => navigate("/app/pro/calendar")} />
            ))}
          </div>
        </>
      )}
      {strip}
    </div>
  );
}

function WorkCard({ w, now, onCalendar }: { w: WorkItem; now: Date; onCalendar: () => void }) {
  const m = useMarketColors();
  const dark = useIsDark();
  const [tagBg, tagInk] = fixedPair(TAG[w.tag][0], TAG[w.tag][1], dark);
  const border = w.tag === "NEW" ? `1.5px solid ${fixedInk("#4F8F8A", dark)}` : `1px solid ${m.border}`;
  return (
    <article aria-label={`${w.roleTitle}, ${w.businessName}`} style={{ borderRadius: 20, background: m.card, border, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 10px", display: "flex", gap: 12, alignItems: "center" }}>
        <InitialsTile text={initialsOf(w.businessName)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: px(12), fontWeight: 600, color: m.accent }}>{w.businessName}</div>
          <h2 style={{ fontSize: px(15), fontWeight: 800, lineHeight: lh(20), margin: 0 }}>{w.roleTitle}</h2>
          <div style={{ fontSize: px(11.5), color: m.faint }}>{sinceLine(w, now)}</div>
        </div>
        <span style={{ fontSize: px(10), fontWeight: 800, letterSpacing: "0.08em", borderRadius: 999, padding: "3px 8px", background: tagBg, color: tagInk, whiteSpace: "nowrap", flexShrink: 0 }}>{t(w.tag)}</span>
      </div>
      {w.classes.length ? (
        <>
          <CapsLabel as="p" style={{ padding: "0 16px 4px" }}>
            {w.type === "class_slot" ? t("Class") : t("Assigned classes")}
          </CapsLabel>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {w.classes.map((c, i) => {
              const r = workClassRow(c, w);
              return (
                <li key={`${c.title}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: i ? `0.5px solid ${m.div}` : 0 }}>
                  <span style={{ minWidth: 52, boxSizing: "border-box", flexShrink: 0, textAlign: "center", borderRadius: 10, background: m.pale, padding: "6px 2px" }}>
                    <span style={{ display: "block", fontSize: px(13), fontWeight: 800, whiteSpace: "nowrap" }}>
                      {r.time ? (
                        <>
                          {r.time.time}
                          <span style={{ fontSize: px(9.5) }}>{` ${r.time.meridiem}`}</span>
                        </>
                      ) : (
                        "–"
                      )}
                    </span>
                    {r.day ? <span style={{ display: "block", fontSize: px(9.5), fontWeight: 700, color: m.faint }}>{r.day}</span> : null}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: px(13.5), fontWeight: 700 }}>{r.title}</span>
                    {r.sub ? <span style={{ display: "block", fontSize: px(11.5), color: m.faint }}>{r.sub}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      <button
        type="button"
        onClick={onCalendar}
        className="hit market-focus"
        style={{ width: "100%", padding: "10px 16px", border: 0, borderTop: `0.5px solid ${m.div}`, background: "transparent", display: "flex", alignItems: "center", gap: 8, fontSize: px(12.5), fontWeight: 800, color: m.pdark, fontFamily: "inherit", textAlign: "start", cursor: "pointer" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span style={{ flex: 1 }}>{calendarLine(w)}</span>
        <ChevronRight size={14} strokeWidth={2.2} aria-hidden style={isRtl() ? { transform: "scaleX(-1)" } : NO_ICON_SCALE} />
      </button>
      <div style={{ padding: "10px 16px 12px", borderTop: `0.5px solid ${m.div}`, display: "flex", justifyContent: "space-between", gap: 12, fontSize: px(12) }}>
        <span style={{ color: m.faint }}>{t("Pay, arranged with the gym")}</span>
        <span style={{ fontWeight: 800 }}>{workPay(w)}</span>
      </div>
    </article>
  );
}

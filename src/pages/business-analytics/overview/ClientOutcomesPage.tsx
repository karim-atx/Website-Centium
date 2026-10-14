import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { linePx, textPx } from "../../../theme/textSize";
import { ErrorRow, KitEmpty, KitLabel, KitList, KitTip, NumberBoxes } from "../../../components/business-dashboard/parts";
import { useAnalytics } from "../analyticsContext";
import { loadOverview } from "./overviewData";
import { isoDay, outcomes, type OvRaw } from "./overviewModel";
import { anPalette, type AnPalette } from "./palette";

// Analytics › Client outcomes (OURS-AN1-client-outcomes, V6-28): the kept
// Client Outcomes feature in the AN1 / BizTypeKit language, opened from the
// full-width "More insights" card (and the Members people block). The shell
// draws the BizTypeKit back header, the range tabs and the range line (no
// Export CSV: health aggregates are not exported).
//
// PRIVACY FIRST. A business sees health data only from clients who chose to
// share it with that business, in groups of 5 or more (B7 consent,
// business_client_shares + business_client_outcomes): until that exists the
// Shared progress block is the honest empty state. The attendance block is
// the business's own booking data and ships now: Bookings a week and Need a
// check-in (no booking in 21 days) from business_class_bookings; "Attending
// 80%+" and the spread need attendance (check-ins B10 / the cancellations
// reader), so they show "–". Clients are masked ("Client #code") until the
// profile-sharing consent exists (B7). Safety wording kept verbatim.

export const SAFETY = "Flags are based on visible signals (attendance, bookings, payments), not a diagnosis or a black-box score.";
/**
 * KEEP-SAFETY, verbatim from the old Analytics' "Physio outcome worsening"
 * action (main BusinessAnalyticsTab.tsx:59; AN1-034 K1, OURS rule 4 / row
 * 10, SW-37). Shown in the safety tip on this page, where a business acts on
 * a client who needs review; the B7 Treatment outcomes row reuses it.
 */
export const CLINICIAN_REVIEW = "Flag for clinician review; avoid automatic diagnosis or treatment advice.";
const BUCKETS = ["0-24%", "25-49%", "50-74%", "75-100%"];

export function ClientOutcomesPage() {
  const { range, kind, setExport } = useAnalytics();
  const { authUserId, profileReady, accessibility } = useApp();
  const dark = useIsDark();
  const c = useMemo(() => anPalette(dark, !!accessibility.highContrast), [dark, accessibility.highContrast]);
  const online = useOnline();
  const [raw, setRaw] = useState<OvRaw | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const today = isoDay(new Date());

  useEffect(() => setExport("", null), [setExport]);

  const load = useCallback(async () => {
    if (!authUserId) return;
    const r = await loadOverview(authUserId, range, isoDay(new Date()));
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setRaw(r.raw);
    setLoadedFor(`${range.from}|${range.to}`);
  }, [authUserId, range]);
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [profileReady, authUserId, load]);

  const loading = !raw || loadedFor !== `${range.from}|${range.to}`;
  const m = useMemo(() => (raw ? outcomes(raw, range, today) : null), [raw, range, today]);
  const classes = kind === "classes";

  if (error && !raw) return <ErrorRow c={c} text={online ? error : "You're offline. Check your connection and try again."} onRetry={() => void load()} />;

  const rows = m?.review ?? [];
  const shown = all ? rows : rows.slice(0, 3);

  return (
    <div data-client-outcomes>
      {error && <ErrorRow c={c} text={error} onRetry={() => void load()} />}
      <KitLabel c={c} label="Attendance" />
      {loading || !m ? (
        <Skeleton c={c} />
      ) : (
        <>
          <NumberBoxes
            c={c}
            boxes={[
              { value: "–", label: "Attending 80%+" },
              { value: classes && m.perWeek !== null ? m.perWeek.toFixed(1) : "–", label: classes ? "Bookings a week" : "Visits a week" },
              { value: m.needCheckIn === null ? "–" : String(m.needCheckIn), label: "Need a check-in" },
            ]}
          />
          <SpreadBars c={c} />
          {m.early && <KitTip c={c} text="Trends appear after your first two weeks of classes." />}
        </>
      )}

      <KitLabel c={c} label="Shared progress" />
      <KitEmpty c={c} icon="heart-pulse" title="Not enough shared data yet" body="Outcomes appear once 5 or more clients choose to share their progress with you." />

      {!loading && rows.length > 0 && (
        <>
          <KitLabel c={c} label="Clients needing review" action={rows.length > 3 ? (all ? "Show less" : "See all") : undefined} onAction={() => setAll((v) => !v)} />
          <KitList c={c} rows={shown.map((r) => ({ key: r.id, Icon: User, title: r.label, detail: r.detail, pill: r.pill }))} />
        </>
      )}
      <KitTip c={c} text={`${SAFETY} ${CLINICIAN_REVIEW}`} />
    </div>
  );
}

/** Attendance spread (OURS #6): 4 buckets; groups under 5 show "–" (no attendance reader yet: all "–"). */
function SpreadBars({ c }: { c: AnPalette }) {
  const cols = c.dark ? ["#F09A8E", "#E0B360", "#A2C8C2", "#7FC79C"] : ["#C0392B", "#D9A441", "#6F9993", "#3F9165"];
  return (
    <div data-spread style={{ borderRadius: 18, background: c.listBg, padding: 14, marginBottom: 14 }}>
      <p style={{ fontSize: textPx(13), fontWeight: 800, margin: 0, color: c.ink, lineHeight: 1.5 }}>Attendance spread</p>
      <p style={{ fontSize: textPx(11.5), color: c.faint, marginBottom: 12, marginTop: 0, lineHeight: 1.5 }}>How many clients come as often as they book?</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96 }} role="img" aria-label="Attendance spread: not enough data yet">
        {BUCKETS.map((b, i) => (
          <div key={b} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: textPx(11), fontWeight: 800, color: c.tert, lineHeight: linePx(14) }}>–</span>
            <div data-bar style={{ width: "100%", height: "4%", borderRadius: "6px 6px 3px 3px", background: cols[i], opacity: 0.35 }} />
            <span style={{ fontSize: textPx(9), color: c.faint, height: linePx(11), lineHeight: linePx(11) }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton({ c }: { c: AnPalette }) {
  return (
    <div role="status" aria-label="Loading" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="animate-skeleton-pulse" style={{ height: 74, borderRadius: 16, background: c.soft }} />
      ))}
    </div>
  );
}

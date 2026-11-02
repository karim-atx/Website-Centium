import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { linePx, textPx } from "../../../theme/textSize";
import { ErrorRow, KitEmpty, KitLabel, KitList, KitTip, NumberBoxes } from "../../../components/business-dashboard/parts";
import { useAnalytics } from "../analyticsContext";
import { loadOverview } from "./overviewData";
import { isoDay, outcomes, sharedProgress, shareBody, type OvRaw } from "./overviewModel";
import { anPalette, type AnPalette } from "./palette";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { fetchOutcomeShareCount } from "../../../services/business-members";
import { fetchClientOutcomes, fetchPeopleSummary, type ClientOutcomes } from "../../../services/business-analytics";
import { startMemberThread } from "../../../services/messaging";
import { useBizToast } from "../../../components/business-more/useBizToast";
import { t, tk } from "../../../i18n/core";

// Analytics › Client outcomes (OURS-AN1-client-outcomes, V6-28): the kept
// Client Outcomes feature in the AN1 / BizTypeKit language, opened from the
// full-width "More insights" card (and the Members people block). The shell
// draws the BizTypeKit back header, the range tabs and the range line (no
// Export CSV: health aggregates are not exported).
//
// PRIVACY FIRST. A business sees health data only from clients who chose to
// share it with that business, in groups of 5 or more (B7 consent,
// business_client_shares + B15 business_client_outcomes, DI-07: no range, plan
// or class, all null below 5 sharers): below 5 the Shared progress block is
// the honest empty state with the share count. The attendance block is
// the business's own booking data and ships now: Bookings a week and Need a
// check-in (no booking in 21 days) from business_class_bookings; "Attending
// 80%+" and the spread need attendance (check-ins B10 / the cancellations
// reader), so they show "–". Gym "Visits a week" is business_people_summary
// visits_per_week_4w (its own 4-week window, as on Members › Visits). Clients
// are masked ("Client #code") until the profile-sharing consent exists (B7).
// A review row opens the business's thread with that client (row 13, B7 MB-02
// start_member_thread; the server allows current members and anyone with a
// booking or membership in the last 90 days). Safety wording kept verbatim.

const SAFETY = tk("Flags are based on visible signals (attendance, bookings, payments), not a diagnosis or a black-box score.");
/**
 * KEEP-SAFETY, verbatim from the old Analytics' "Physio outcome worsening"
 * action (main BusinessAnalyticsTab.tsx:59; AN1-034 K1, OURS rule 4 / row
 * 10, SW-37). Shown in the safety tip on this page, where a business acts on
 * a client who needs review; the B7 Treatment outcomes row reuses it.
 */
const CLINICIAN_REVIEW = tk("Flag for clinician review; avoid automatic diagnosis or treatment advice.");
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
  // DI-07 (B15 business_client_outcomes): the cohort's aggregates, and how
  // many share (a count only; never who). The B7 count stays the fallback
  // while the outcomes reader is not on the database.
  const { business } = useBusiness();
  const [shared, setShared] = useState<ClientOutcomes | null>(null);
  const [shareCount, setShareCount] = useState<number | null>(null);
  useEffect(() => {
    if (!business?.id) return;
    const bid = business.id;
    let alive = true;
    void fetchClientOutcomes(bid).then(async (r) => {
      if (!alive) return;
      if (r.ok && r.value) {
        setShared(r.value);
        setShareCount(r.value.sharing);
        return;
      }
      if (!r.ok && r.pending) {
        const n = await fetchOutcomeShareCount(bid);
        if (alive) setShareCount(n);
      }
    });
    return () => {
      alive = false;
    };
  }, [business?.id]);
  const progress = shared ? sharedProgress(shared, kind) : null;
  // Row 5 (Gym): visits a week from business_people_summary (null: not read, or not readable).
  const [visits, setVisits] = useState<number | null>(null);
  useEffect(() => {
    if (!business?.id || kind !== "gym") return;
    let alive = true;
    void fetchPeopleSummary(business.id).then((r) => {
      if (alive) setVisits(r.ok ? (r.value.visits_per_week_4w ?? null) : null);
    });
    return () => {
      alive = false;
    };
  }, [business?.id, kind]);
  // Row 13: a row opens the chat with that client.
  const navigate = useNavigate();
  const [toast, showToast] = useBizToast();
  const [opening, setOpening] = useState<string | null>(null);
  const openChat = async (clientId: string) => {
    if (!business?.id || opening) return;
    setOpening(clientId);
    const res = await startMemberThread(business.id, clientId);
    setOpening(null);
    if (!res.ok) return showToast(res.message);
    navigate("/app/messages", { state: { threadId: res.threadId } });
  };

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

  if (error && !raw) return <ErrorRow c={c} text={online ? error : t("You're offline. Check your connection and try again.")} onRetry={() => void load()} />;

  const rows = m?.review ?? [];
  const shown = all ? rows : rows.slice(0, 3);

  return (
    <div data-client-outcomes>
      {error && <ErrorRow c={c} text={error} onRetry={() => void load()} />}
      <KitLabel c={c} label={t("Attendance")} />
      {loading || !m ? (
        <Skeleton c={c} />
      ) : (
        <>
          <NumberBoxes
            c={c}
            boxes={[
              { value: "–", label: t("Attending 80%+") },
              { value: classes ? (m.perWeek !== null ? m.perWeek.toFixed(1) : "–") : visits !== null ? visits.toFixed(1) : "–", label: classes ? t("Bookings a week") : t("Visits a week") },
              { value: m.needCheckIn === null ? "–" : String(m.needCheckIn), label: t("Need a check-in") },
            ]}
          />
          <SpreadBars c={c} />
          {m.early && <KitTip c={c} text={t("Trends appear after your first two weeks of classes.")} />}
        </>
      )}

      <KitLabel c={c} label={t("Shared progress")} />
      {progress ? (
        <div data-shared-progress>
          <NumberBoxes c={c} boxes={progress.boxes} />
          <p style={{ fontSize: textPx(11), lineHeight: linePx(15), color: c.faint, margin: "-4px 2px 14px", textWrap: "pretty" }}>{progress.note}</p>
        </div>
      ) : (
        <KitEmpty c={c} icon="heart-pulse" title={t("Not enough shared data yet")} body={shareBody(shareCount)} />
      )}

      {!loading && rows.length > 0 && (
        <>
          <KitLabel c={c} label={t("Clients needing review")} action={rows.length > 3 ? (all ? t("Show less") : t("See all")) : undefined} onAction={() => setAll((v) => !v)} />
          <KitList c={c} rows={shown.map((r) => ({ key: r.id, Icon: User, title: r.label, detail: r.detail, pill: r.pill, onClick: () => void openChat(r.id) }))} />
        </>
      )}
      <KitTip c={c} text={`${t(SAFETY)} ${t(CLINICIAN_REVIEW)}`} />
      {toast}
    </div>
  );
}

/** Attendance spread (OURS #6): 4 buckets; groups under 5 show "–" (no attendance reader yet: all "–"). */
function SpreadBars({ c }: { c: AnPalette }) {
  const cols = c.dark ? ["#F09A8E", "#E0B360", "#A2C8C2", "#7FC79C"] : ["#C0392B", "#D9A441", "#6F9993", "#3F9165"];
  return (
    <div data-spread style={{ borderRadius: 18, background: c.listBg, padding: 14, marginBottom: 14 }}>
      <p style={{ fontSize: textPx(13), fontWeight: 800, margin: 0, color: c.ink, lineHeight: 1.5 }}>{t("Attendance spread")}</p>
      <p style={{ fontSize: textPx(11.5), color: c.faint, marginBottom: 12, marginTop: 0, lineHeight: 1.5 }}>{t("How many clients come as often as they book?")}</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96 }} role="img" aria-label={t("Attendance spread: not enough data yet")}>
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
    <div role="status" aria-label={t("Loading")} style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="animate-skeleton-pulse" style={{ height: 74, borderRadius: 16, background: c.soft }} />
      ))}
    </div>
  );
}

import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarCheck, CircleAlert, EyeOff, HeartPulse, QrCode, ScanLine, Sparkles, Store, Ticket, TrendingUp, type LucideIcon } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useOpsToast } from "../../../components/marketplace/VenueKit";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";
import { useAnalytics } from "../analyticsContext";
import { isoOf, rangeLine, rangeWords } from "../analyticsRange";
import { ClientOutcomesPage } from "../overview/ClientOutcomesPage";
import { AnEmbedded } from "./anEmbedded";
import { AnStrip } from "./anKit";
import { BookingPausesCard } from "./BookingPausesCard";
import { MemberCodesPage } from "./MemberCodesPage";
import { MembersBlocksWeb } from "./MembersBlocks.web";
import { VenueMembersPage } from "./VenueMembersPage";
import { indexValue, isEarly, pageView, pagesOf, vocabOf, type Delta } from "./membersModel";
import { liveCodes, useMembersData } from "./useMembersData";
import { useMembersFigures } from "./useMembersFigures";

// Website viewport v1 · WB-AN.3 Members (WB-AN Analytics Web v5, `memWeb`):
// list-detail. The sections card (4 columns, 3 on the rail; padding 8, rows
// 48 r12 with the 32 tile, title 17 / 15 600, the green delta chip and the
// value 800; the selected row #F0EDF9 with a 3px #9A8CD6 edge) and, under it,
// Booking pauses (WB-AN.3.9, the mobile card). The detail card (8 / 5): its
// header (padding 20 × 24 / 16 × 20: the page title 28/36 700, the line
// 15/24, the range line 13/20; the figure 40/48 700 with its delta chip and
// label) over the page itself, which scrolls in the card. The page body is
// the mobile section page (MembersPage, Member codes, Venue members, Client
// outcomes) without its back header, centred at most 560 wide. The five
// model pages (Growth … Plans; Engagement and At risk for Classes) draw the
// board's block grid instead (MembersBlocks.web). The first page is shown by default;
// the routes are the mobile ones (/analytics/members/<page>, /codes, /venue,
// /analytics/outcomes). Reading and every action are the mobile section's.

const BASE = "/app/business/analytics/members";
type Tone = [string, string];
const LAV: Tone = ["#7D6BB5", "#F0EDF9"];
const TEAL: Tone = ["#3C6B65", "#E8F2F0"];
const GOLD: Tone = ["#9A6B12", "#FBF3E2"];
const GREEN: Tone = ["#1D744A", "#E3F3E9"];
const ICON: Record<string, [LucideIcon, Tone]> = {
  growth: [TrendingUp, LAV],
  first90: [CalendarCheck, TEAL],
  visits: [ScanLine, TEAL],
  engagement: [ScanLine, TEAL],
  notseen: [EyeOff, GOLD],
  atrisk: [CircleAlert, GOLD],
  plans: [Ticket, LAV],
  codes: [QrCode, LAV],
  outcomes: [HeartPulse, GREEN],
  venue: [Store, TEAL],
};

interface Row {
  key: string;
  title: string;
  desc: string;
  value: string | null;
  delta?: Delta;
  vLabel?: string;
  to: string;
}

const DeltaChip: React.FC<{ d: Delta; big?: boolean }> = ({ d, big }) => (
  <span
    style={{
      flex: "none",
      borderRadius: 999,
      padding: big ? "2px 10px" : "1px 8px",
      background: d.tone === "good" ? "rgba(63,145,101,0.14)" : d.tone === "high" ? "#FBE7E4" : "#F5F5F6",
      fontSize: big ? 13 : 12,
      lineHeight: big ? "20px" : "18px",
      fontWeight: 700,
      color: d.tone === "good" ? "#1D744A" : d.tone === "high" ? "#C0392B" : "#71685E",
      whiteSpace: "nowrap",
    }}
  >
    {d.t}
  </span>
);

export const MembersWeb: React.FC<{ rail: boolean; outcomes: boolean }> = ({ rail, outcomes }) => {
  const params = useParams();
  const sub = outcomes ? "outcomes" : (params["*"] ?? "").replace(/\/+$/, "");
  const { kind, range, setExport } = useAnalytics();
  const navigate = useNavigate();
  const online = useOnline();
  const data = useMembersData();
  const access = useConsoleAccess();
  const [toast, showToast] = useOpsToast();
  const vocab = useMemo(() => vocabOf(kind), [kind]);
  const hidePlans = kind === "classes" && !data.loading && !data.plansLoading && data.members !== null && data.plans.length === 0 && data.memberTotal === 0;
  const pages = useMemo(() => pagesOf(kind, { hidePlans }), [kind, hidePlans]);
  const today = isoOf(new Date());
  const fig = useMembersFigures(data.businessId, range, today);
  const early = isEarly(vocab, fig.figures);
  const views = useMemo(() => {
    const ctx = { planCount: data.plans.length, rangeKey: range.key, rangeWords: rangeWords(range, today), compare: range.compare };
    return new Map(pages.map((p) => [p.key, pageView(p, vocab, fig.figures, ctx)]));
  }, [pages, vocab, fig.figures, data.plans.length, range, today]);

  const waiting = data.codes ? liveCodes(data.codes).length : null;
  const activeAtVenues = data.venues.reduce((s, v) => s + v.activeMembers, 0);
  const anyMembers = data.memberTotal > 0 || (data.members?.length ?? 0) > 0 || data.venues.some((v) => v.activeMembers > 0 || v.membershipsAwaitingPayment > 0);
  const known = !data.loading && !data.venuesLoading && (data.members !== null || !data.businessId) && (fig.loaded || !data.businessId);
  const empty = known && !anyMembers && (kind !== "classes" || fig.figures.summary?.class_clients === 0);

  // Export CSV: the index rows, as on mobile (only while no page is open there; here the index is always shown).
  useEffect(() => {
    if (!known) {
      setExport("", null);
      return;
    }
    setExport(`centium-${vocab.people}.csv`, [
      [t("Section"), t("Value"), t("Note")],
      ...pages.map((p) => {
        const v = views.get(p.key);
        return [p.title, v?.boxes[0].value ?? null, v?.lead ?? p.coming];
      }),
      [t("Member codes waiting"), waiting, null],
      ...(data.venues.length > 0 ? [[t("Active at your venues"), activeAtVenues, null]] : []),
    ]);
    return () => setExport("", null);
  }, [known, pages, views, waiting, activeAtVenues, data.venues.length, vocab.people, setExport]);

  const codesLine = waiting === null ? t("Create a code for each new member.") : waiting > 0 ? t("{n} waiting to be used", { n: waiting }) : t("Create a code for each new member.");
  const venueLine = data.venues.length === 1 ? t("{n} active at {venue}", { n: activeAtVenues, venue: data.venues[0].name }) : t("{n} active across {count} venues", { n: activeAtVenues, count: data.venues.length });

  const rows: Row[] = [
    ...pages.map((p): Row => {
      const v = views.get(p.key)!;
      const { value, delta } = indexValue(v);
      return { key: p.key, title: p.title, desc: p.coming, value: empty ? null : value, delta: empty ? undefined : delta, vLabel: v.boxes[0].label, to: `${BASE}/${p.key}` };
    }),
    ...(known ? [{ key: "codes", title: t("Member codes"), desc: codesLine, value: waiting === null ? null : waiting.toLocaleString(appLocale()), to: `${BASE}/codes` }] : []),
    ...(known && !access.isStaff ? [{ key: "outcomes", title: t("Client outcomes"), desc: t("Only from clients who share with you"), value: null, to: "/app/business/analytics/outcomes" }] : []),
    ...(known && data.venues.length > 0 ? [{ key: "venue", title: t("Venue members"), desc: venueLine, value: activeAtVenues.toLocaleString(appLocale()), vLabel: t("Active members"), to: `${BASE}/venue` }] : []),
  ];
  const selected = rows.find((r) => r.key === sub) ?? rows[0] ?? null;
  const page = selected ? pages.find((p) => p.key === selected.key) ?? null : null;

  let body: React.ReactNode = null;
  if (selected?.key === "codes") body = <MemberCodesPage data={data} vocab={vocab} />;
  else if (selected?.key === "venue") body = <VenueMembersPage vocab={vocab} />;
  else if (selected?.key === "outcomes") body = <ClientOutcomesPage />;
  else if (page) body = <MembersBlocksWeb page={page} vocab={vocab} view={views.get(page.key)!} figures={fig.figures} data={data} empty={empty} early={known && early} rail={rail} />;

  return (
    <div data-an="members" style={{ flex: 1, minHeight: 0, marginTop: 24, display: "grid", gridTemplateColumns: rail ? "minmax(0,3fr) minmax(0,5fr)" : "minmax(0,4fr) minmax(0,8fr)", gridTemplateRows: "minmax(0,1fr)", gap: 24 }}>
      <div style={{ minWidth: 0, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {(data.error || fig.error) && (
          <div style={{ marginBottom: 12 }}>
            <AnStrip
              offline={!online}
              text={online ? t("Couldn't load your members. Check your connection and try again.") : t("You're offline. Showing members as of your last visit.")}
              onRetry={() => {
                data.reload();
                fig.reload();
              }}
            />
          </div>
        )}
        <nav
          aria-label={vocab.label === "Clients" ? t("Clients sections") : t("Members sections")}
          data-an="sections"
          style={{ flex: "none", boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", borderRadius: 20, overflow: "hidden", padding: 8, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {!known
            ? Array.from({ length: pages.length + 3 }, (_, i) => <span key={i} className="block animate-skeleton-pulse" style={{ height: 48, borderRadius: 12, background: i % 2 ? "#FAFAFB" : "#F5F5F7" }} />)
            : rows.map((r) => {
                const on = r.key === selected?.key;
                const [Icon, tone] = ICON[r.key] ?? [Sparkles, LAV];
                return (
                  <button
                    key={r.key}
                    type="button"
                    data-an-row={r.key}
                    aria-current={on ? "page" : undefined}
                    onClick={() => navigate(r.to, { replace: true })}
                    className={`${on ? "" : "hover:!bg-[#FAFAFB] "}focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#AEA1DC]`}
                    style={{ position: "relative", flex: "none", height: 48, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 14px", borderRadius: 12, background: on ? "#F0EDF9" : "transparent", border: 0, cursor: "pointer", textAlign: "start", width: "100%" }}
                  >
                    <span aria-hidden style={{ position: "absolute", insetInlineStart: 0, top: 8, bottom: 8, width: 3, borderStartEndRadius: 3, borderEndEndRadius: 3, background: on ? "#9A8CD6" : "transparent" }} />
                    <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: tone[1], color: tone[0], display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span title={r.title} style={{ flex: 1, minWidth: 0, fontSize: rail ? 15 : 17, lineHeight: "24px", fontWeight: 600, color: on ? "#5F5093" : "#241F1B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.title}
                    </span>
                    {r.delta && !rail && <DeltaChip d={r.delta} />}
                    <span style={{ flex: "none", fontSize: rail ? 15 : 17, lineHeight: "24px", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: r.value === null ? "#776E64" : on ? "#5F5093" : "#241F1B", whiteSpace: "nowrap" }}>{r.value ?? "–"}</span>
                  </button>
                );
              })}
        </nav>
        {known && <BookingPausesCard businessId={data.businessId} onToast={showToast} />}
      </div>

      <section aria-label={selected?.title} data-an="detail-card" style={{ minWidth: 0, minHeight: 0, boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selected && (
          <header style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 24, padding: rail ? "16px 20px" : "20px 24px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 data-an-title style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>{selected.title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>{selected.desc}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{rangeLine(range)}</p>
            </div>
            {selected.value !== null && (
              <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {selected.delta && <DeltaChip d={selected.delta} big />}
                  <span data-an-figure style={{ fontSize: 40, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums lining-nums", color: "#241F1B", whiteSpace: "nowrap" }}>{selected.value}</span>
                </div>
                {selected.vLabel && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E", whiteSpace: "nowrap" }}>{selected.vLabel}</p>}
              </div>
            )}
          </header>
        )}
        <div data-an="detail" style={{ flex: 1, minHeight: 0, overflow: "auto", scrollbarWidth: "thin", padding: rail ? "16px 20px" : "20px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
          {!known ? (
            <span className="block animate-skeleton-pulse" style={{ height: 240, borderRadius: 16, background: "#F5F5F7" }} />
          ) : page ? (
            body
          ) : (
            /* Member codes, Venue members and Client outcomes keep the mobile page body, at most 560 wide. */
            <div style={{ width: "100%", maxWidth: 560, marginInline: "auto" }}>
              <AnEmbedded.Provider value={true}>{body}</AnEmbedded.Provider>
            </div>
          )}
        </div>
      </section>
      {toast}
    </div>
  );
};

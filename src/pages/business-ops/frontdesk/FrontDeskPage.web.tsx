import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Banknote, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Plus, RefreshCw, ScanLine, UserCheck, XCircle } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { usePoll } from "../../../hooks/usePoll";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useBizToast } from "../../../components/business-more/useBizToast";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { startMemberThread } from "../../../services/messaging";
import { endGymMembership, markDeskSalePaid, renewMembership } from "../../../services/front-desk";
import {
  deskMoney,
  entrySub,
  hourBins,
  hourCounts,
  hourShort,
  isDeskMethod,
  renewalSub,
  weekSales,
  type DeskSale,
  type Entry,
  type FrontDeskMember,
  type RenewalDue,
} from "../../../services/front-desk/frontDeskLogic";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { todayLocal } from "../../../utils/date";
import { clock12 } from "../../../utils/time12";
import { t, tk, tn, tx } from "../../../i18n/core";
import { CheckInSheet } from "./CheckInSheet";
import { ScanSheet, type CheckInPreset } from "./ScanSheet";
import { ErrorCard } from "./frontDeskKit";
import { expiredRows, expiredSub, type ExpiredRow } from "./expiredRows";
import { useFrontDesk, type DeskState } from "./useFrontDesk";
import { INK, INK2, LAV, LIST_BG, MUTED, TINT } from "./deskWebTokens";
import {
  WebChip,
  WebChipButton,
  WebDeskRow,
  WebEmptyCard,
  WebGroupCaption,
  WebListCard,
  WebListLine,
  WebMenu,
  WebPopup,
  WebPrimaryButton,
  WebPulse,
  WebSectionLabel,
  WebUnderlineTabs,
} from "./FrontDeskParts.web";

// Website viewport v1 · WB-FD Front desk (WB-FD Front Desk Web v4), from
// 1024px wide, at /app/business/operations for a gym. The page header (64:
// the title, "At {venue}" when there are two venues or more, Scan a pass 40,
// the 40 primary CTA) over the underline tabs Entries · Passes · Memberships
// and the tab, filling the window (padding 32, content max 1280):
// - Entries (WB-FD.1): the three number boxes and Entries by hour (every
//   hour labelled) in 8 columns, Entries today grouped by hour in 4 (half
//   and half on the rail); the dashed empty card with its CTA inside.
// - Passes (WB-FD.2, .2.1): Renewals in the next 30 days (This week / Later)
//   in 8, the Member QR pass card and Day passes this week / to collect in 4;
//   a row opens its anchored menu, End membership the 440 popup.
// - Memberships (WB-FD.3): the plan list beside the plan page (5 + 7).
// Check someone in and Scan a pass are the mobile sheets, which open as 440
// side sheets from 1024 (WB-FD.1.2 / .1.3, REPO CHANGED: the current mobile
// screens with the global rules). Reading, polling, every write and the
// destinations are the mobile Front desk's, unchanged; the mobile page itself
// is not touched.

export type DeskTab = "entries" | "passes" | "memberships";
const TABS: { key: DeskTab; label: string }[] = [
  { key: "entries", label: tk("Entries") },
  { key: "passes", label: tk("Passes") },
  { key: "memberships", label: tk("Memberships") },
];
const TITLE: Record<DeskTab, string> = {
  entries: tk("Front desk"),
  passes: tk("Passes and renewals"),
  memberships: tk("Memberships"),
};

const GAP = 24;

export const FrontDeskPageWeb: React.FC<{
  /** The Memberships tab's web body (list-detail), mounted under its permission gate. */
  memberships: (addRef: (open: () => void) => void) => React.ReactNode;
}> = ({ memberships }) => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: DeskTab = raw === "passes" || raw === "memberships" ? raw : "entries";
  const setTab = (next: DeskTab) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (next === "entries") n.delete("tab");
        else n.set("tab", next);
        return n;
      },
      { replace: true }
    );

  const navigate = useNavigate();
  const online = useOnline();
  const { rail } = useWebLayout();
  const data = useFrontDesk();
  const gymIds = useMemo(() => data.venues.map((v) => v.gymId), [data.venues]);
  const [clock, setClock] = useState(() => new Date());
  usePoll(() => setClock(new Date()), 60_000);
  const [checkIn, setCheckIn] = useState<{ open: boolean; preset: CheckInPreset | null }>({ open: false, preset: null });
  const [scan, setScan] = useState(false);
  const [venueMenu, setVenueMenu] = useState<HTMLElement | null>(null);
  const [toast, showToast] = useBizToast();
  const [addPlan, setAddPlan] = useState<(() => void) | null>(null);
  const { refreshDesk } = data;
  usePoll(refreshDesk, 120_000, online && tab === "entries" && data.desk.live === true);
  const readAt = data.desk.readAt;
  const now = readAt && readAt > clock ? readAt : clock;
  const deskVenue = data.venues.find((v) => v.gymId === data.deskGymId) ?? null;
  const showVenue = !!deskVenue && data.venues.length > 1 && tab !== "memberships";

  const offlineLine =
    !online && data.loadedAt && tab !== "memberships"
      ? tab === "entries"
        ? t("Offline. Showing entries from {time}.", { time: clock12(data.loadedAt) })
        : t("Offline. Showing data from {time}.", { time: clock12(data.loadedAt) })
      : null;

  const cols = rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)";

  return (
    <div data-front-desk="web" style={{ color: INK, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header style={{ height: 64, flex: "none", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 32px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{t(TITLE[tab])}</h1>
          {showVenue && deskVenue && (
            <button
              type="button"
              data-desk-venue
              aria-haspopup="menu"
              aria-expanded={!!venueMenu}
              aria-label={t("Checking in at {name}. Change venue", { name: deskVenue.name })}
              onClick={(e) => setVenueMenu(e.currentTarget)}
              className="hover:!bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: INK2, whiteSpace: "nowrap", cursor: "pointer", borderRadius: 999, padding: "2px 8px", marginInlineStart: -8, background: "transparent", border: 0, boxShadow: venueMenu ? `0 0 0 2px ${LAV}` : "none", minWidth: 0, overflow: "hidden" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t("At {name}", { name: deskVenue.name })}</span>
              <ChevronDown size={16} strokeWidth={2.2} aria-hidden style={{ flex: "none" }} />
            </button>
          )}
          {tab === "memberships" && (
            <p title={t("Membership plans clients can buy on Explore")} style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
              {t("Membership plans clients can buy on Explore")}
            </p>
          )}
        </div>
        {data.runsClasses && <HeaderIcon icon={CalendarDays} label={t("Class schedule")} onClick={() => navigate("/app/business/classes")} />}
        <HeaderIcon icon={ScanLine} label={t("Scan a pass")} active={scan} onClick={() => setScan(true)} />
        {tab === "entries" && <WebPrimaryButton size={40} icon={Plus} label={t("Check someone in")} onClick={() => setCheckIn({ open: true, preset: null })} />}
        {tab === "memberships" && addPlan && <WebPrimaryButton size={40} icon={Plus} label={t("Add plan")} onClick={addPlan} disabled={!online} />}
      </header>

      <div style={{ flex: "none", height: "calc(100dvh - 64px)", minHeight: 480, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1280, height: "100%", boxSizing: "border-box", padding: "32px", display: "flex", flexDirection: "column" }}>
          <WebUnderlineTabs tabs={TABS.map((x) => ({ ...x, label: t(x.label) }))} value={tab} onChange={setTab} label={t("Front desk")} idPrefix="fd" />
          {offlineLine && (
            <p role="status" style={{ margin: "-12px 2px 12px", fontSize: 13, lineHeight: "20px", color: MUTED }}>
              {offlineLine}
            </p>
          )}
          <div role="tabpanel" id={`fd-panel-${tab}`} aria-labelledby={`fd-tab-${tab}`} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {tab === "entries" && <EntriesWeb noVenue={!data.loading && !data.deskGymId} desk={data.desk} error={data.error} onRetry={data.reload} now={now} cols={cols} rail={rail} onCheckIn={() => setCheckIn({ open: true, preset: null })} />}
            {tab === "passes" && (
              <PassesWeb
                cols={cols}
                renewals={data.renewals}
                loading={data.loading}
                error={data.error}
                onRetry={data.reload}
                online={online}
                onChanged={data.reload}
                planTerms={data.planTerms}
                desk={data.desk}
                members={data.members}
                sellsDayPass={data.dayPasses.length > 0}
                onDeskChanged={refreshDesk}
                showToast={showToast}
              />
            )}
            {tab === "memberships" && memberships((open) => setAddPlan(() => open))}
          </div>
        </div>
      </div>

      <CheckInSheet
        open={checkIn.open}
        preset={checkIn.preset}
        onClose={() => setCheckIn({ open: false, preset: null })}
        gymId={data.deskGymId}
        gymIds={gymIds}
        members={data.members}
        online={online}
        live={data.desk.live}
        dayPasses={data.dayPasses}
        onScanInstead={() => {
          setCheckIn({ open: false, preset: null });
          setScan(true);
        }}
        onDone={(message) => {
          setCheckIn({ open: false, preset: null });
          showToast(message);
          refreshDesk();
        }}
      />
      <ScanSheet
        open={scan}
        onClose={() => setScan(false)}
        online={online}
        gymId={data.deskGymId}
        live={data.desk.live}
        sellsDayPass={data.desk.live === true && data.dayPasses.length > 0}
        onChanged={refreshDesk}
        onCheckInByName={(preset) => {
          setScan(false);
          setCheckIn({ open: true, preset });
        }}
      />
      <WebMenu
        open={!!venueMenu}
        anchor={venueMenu}
        onClose={() => setVenueMenu(null)}
        heading={t("Checking in at")}
        width={260}
        align="start"
        selected={data.deskGymId}
        options={data.venues.map((v) => ({ value: v.gymId, label: v.name }))}
        onSelect={(id) => {
          setVenueMenu(null);
          data.setDeskGymId(id);
        }}
      />
      {toast}
    </div>
  );
};

/** A 40 round icon button in the header (20 #5B5349; hover #F5F5F6; #F0EDF9 while its sheet is open). */
const HeaderIcon: React.FC<{ icon: typeof ScanLine; label: string; onClick: () => void; active?: boolean }> = ({ icon: Icon, label, onClick, active }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="hover:!bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ width: 40, height: 40, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", background: active ? TINT : "transparent", border: 0, cursor: "pointer", color: INK2 }}
  >
    <Icon size={20} aria-hidden />
  </button>
);

// ------------------------------------------------------------------ Entries

function updatedLine(at: Date | null, now: Date): string | null {
  if (!at) return null;
  const min = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  return min < 1 ? t("Updated just now") : tn(min, "Updated {n} min ago", "Updated {n} min ago");
}

const EntriesWeb: React.FC<{ noVenue: boolean; desk: DeskState; error: string | null; onRetry: () => void; now: Date; cols: string; rail: boolean; onCheckIn: () => void }> = ({ noVenue, desk, error, onRetry, now, cols, rail, onCheckIn }) => {
  const entries = useMemo(() => desk.entries ?? [], [desk.entries]);
  const hours = useMemo(() => {
    const entryHours = [...new Set(entries.filter((e) => e.result === "in").map((e) => new Date(e.at).getHours()))];
    return hourCounts(entries, hourBins(desk.todayHours, entryHours, now.getHours()));
  }, [entries, desk.todayHours, now]);
  const groups = useMemo(() => {
    const g = new Map<number, Entry[]>();
    for (const e of entries) {
      const h = new Date(e.at).getHours();
      g.set(h, [...(g.get(h) ?? []), e]);
    }
    return [...g];
  }, [entries]);

  if (!noVenue && desk.loading && !desk.summary && desk.live !== false && !error) {
    return (
      <div aria-busy="true" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: cols, gap: GAP }}>
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <WebPulse key={i} style={{ height: 104 }} />
            ))}
          </div>
          <WebPulse style={{ flex: 1, borderRadius: 18, minHeight: 240 }} />
        </div>
        <WebPulse style={{ borderRadius: 18, minHeight: 240 }} />
      </div>
    );
  }
  if ((error || desk.error) && !desk.summary) return <ErrorCard title={t("Couldn't load entries")} onRetry={onRetry} />;
  if (noVenue || desk.live !== true || !desk.summary || !desk.entries || desk.everAny === false) {
    return (
      <WebEmptyCard icon={ScanLine} title={tx("No entries yet", "gym entries")} body={t("Members scan their pass at the door, or you check them in here.")} style={{ flex: 1, minHeight: 320 }}>
        <WebPrimaryButton icon={Plus} label={t("Check someone in")} onClick={onCheckIn} />
      </WebEmptyCard>
    );
  }
  const summary = desk.summary;
  const quiet = entries.length === 0;
  const max = Math.max(0, ...hours.map((h) => h.count));
  const current = now.getHours();
  const updated = updatedLine(desk.readAt, now);

  return (
    <div data-fd-entries style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: cols, gridTemplateRows: "minmax(0,1fr)", gap: GAP }}>
      <div style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: GAP }}>
        <div data-fd-boxes style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
          {[
            { label: t("Entries today"), value: String(summary.entriesToday) },
            { label: t("In now"), value: String(summary.inNow) },
            { label: t("Denied"), value: String(summary.deniedToday) },
          ].map((b) => (
            <div key={b.label} style={{ borderRadius: 16, background: LIST_BG, padding: "16px 18px", minHeight: 70, boxSizing: "border-box", minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 40, lineHeight: "48px", fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: INK }}>{b.value}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: MUTED }}>{b.label}</p>
            </div>
          ))}
        </div>
        <div data-fd-chart style={{ flex: 1, minHeight: 0, borderRadius: 18, background: LIST_BG, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
          <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{t("Entries by hour")}</p>
          <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: "20px", color: MUTED }}>{t("How busy is it right now?")}</p>
          {quiet || hours.length === 0 ? (
            <p style={{ flex: 1, minHeight: 96, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: "20px", color: MUTED }}>{t("No entries yet today.")}</p>
          ) : (
            <div role="img" aria-label={hours.map((h) => `${hourShort(h.hour)} ${h.count}`).join(", ")} style={{ flex: 1, minHeight: 96, display: "flex", alignItems: "flex-end", gap: rail ? 3 : 8 }}>
              {hours.map((h) => (
                <div key={h.hour} title={`${hourShort(h.hour)} · ${h.count}`} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                  <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                    <div data-fd-bar style={{ width: "100%", height: `${max > 0 ? (h.count / max) * 100 : 0}%`, borderRadius: "6px 6px 3px 3px", background: h.hour === current ? "#9A8CD6" : LAV }} />
                  </div>
                  <span style={{ display: "block", marginTop: 4, fontSize: 11, lineHeight: "16px", color: MUTED, whiteSpace: "nowrap", textAlign: "center" }}>{hourShort(h.hour)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <WebSectionLabel trailing={updated ? <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>{updated}</span> : undefined}>{t("Entries today")}</WebSectionLabel>
        <div data-fd-list style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {quiet ? (
            <WebListLine>{t("No entries yet today.")}</WebListLine>
          ) : (
            groups.map(([h, list]) => (
              <section key={h} aria-label={hourShort(h)} style={{ flex: "none" }}>
                <WebGroupCaption>{clock12(new Date(now.getFullYear(), now.getMonth(), now.getDate(), h))}</WebGroupCaption>
                <WebListCard label={hourShort(h)}>
                  {list.map((e, i) => (
                    <WebDeskRow
                      key={e.id}
                      icon={isDeskMethod(e.method) ? UserCheck : ScanLine}
                      title={e.title}
                      sub={entrySub(e)}
                      first={i === 0}
                      trailing={e.result === "in" ? <WebChip tone="good">{tx("In", "entry result")}</WebChip> : <WebChip tone="high">{t("Denied")}</WebChip>}
                    />
                  ))}
                </WebListCard>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------- Passes

const PassesWeb: React.FC<{
  cols: string;
  renewals: RenewalDue[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  online: boolean;
  onChanged: () => void;
  planTerms?: Map<string, string[]>;
  desk: DeskState;
  sellsDayPass: boolean;
  members: FrontDeskMember[];
  onDeskChanged: () => void;
  showToast: (m: string) => void;
}> = ({ cols, renewals, loading, error, onRetry, online, onChanged, planTerms, desk, sellsDayPass, members, onDeskChanged, showToast }) => {
  const [menuFor, setMenuFor] = useState<RenewalDue | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [ending, setEnding] = useState<RenewalDue | null>(null);
  const [busy, setBusy] = useState(false);
  const access = useConsoleAccess();
  const navigate = useNavigate();
  const canRemind = (r: RenewalDue) => online && !!r.personId && !!access.businessId && access.meets("messages");
  const canDesk = access.meets("front_desk");

  const remind = async (r: RenewalDue) => {
    if (busy || !access.businessId || !r.personId) return;
    setBusy(true);
    const res = await startMemberThread(access.businessId, r.personId);
    setBusy(false);
    if (!res.ok) return showToast(res.message);
    navigate("/app/messages", { state: { threadId: res.threadId } });
  };
  const renew = async (r: RenewalDue) => {
    if (busy) return;
    setBusy(true);
    const res = await renewMembership(r.membershipId);
    setBusy(false);
    if (!res.ok) return showToast(res.message);
    showToast(t("{name}'s membership is renewed from {date}. Payment is due.", { name: r.label, date: dayMonthYear(r.expiresOn) }));
    onChanged();
  };
  const labelOf = new Map(members.filter((m) => m.personId).map((m) => [m.personId as string, m.label]));
  const saleWho = (sale: DeskSale) => (sale.personId ? labelOf.get(sale.personId) ?? t("Member") : sale.who);
  const markSalePaid = async (sale: DeskSale) => {
    if (busy || !canDesk) return;
    setBusy(true);
    const res = await markDeskSalePaid(sale.id);
    setBusy(false);
    if (!res.ok) return showToast(res.message);
    showToast(t("{name}'s {plan} is marked as paid.", { name: saleWho(sale), plan: sale.planName }));
    offerPromotionUsed({ kind: "day_pass", sourceId: sale.id });
    onDeskChanged();
  };

  const week = renewals.filter((r) => r.daysLeft <= 7);
  const later = renewals.filter((r) => r.daysLeft > 7);
  const expired = expiredRows(members, todayLocal());
  const dueNow: (RenewalDue | ExpiredRow)[] = [...week, ...expired];
  const isExpired = (r: RenewalDue | ExpiredRow): r is ExpiredRow => "daysAgo" in r;
  const none = dueNow.length === 0 && later.length === 0;
  const week2 = desk.live === true && desk.weekSales ? weekSales(desk.weekSales) : null;
  const unpaid = desk.live === true ? (desk.weekSales ?? []).filter((x) => !x.paid) : [];
  const showDayPasses = sellsDayPass || (desk.weekSales?.length ?? 0) > 0 || desk.live !== true;

  const row = (r: RenewalDue, i: number) => (
    <WebDeskRow
      key={r.membershipId}
      icon={r.alreadyRenewed ? CheckCircle2 : r.cancelAtPeriodEnd ? XCircle : RefreshCw}
      title={r.label}
      sub={renewalSub(r)}
      first={i === 0}
      ariaLabel={t("{name}, {detail}. Options", { name: r.label, detail: renewalSub(r) })}
      menuOpen={menuFor?.membershipId === r.membershipId}
      onClick={(el) => {
        setAnchor(el);
        setMenuFor(r);
      }}
      trailing={
        r.alreadyRenewed ? (
          <WebChip tone="good">{t("Renewed")}</WebChip>
        ) : r.cancelAtPeriodEnd ? (
          <WebChip tone="warn">{t("Ending")}</WebChip>
        ) : (
          <WebChipButton
            tone="pale"
            label={t("Remind")}
            ariaLabel={canRemind(r) ? t("Remind {name}", { name: r.label }) : t("Remind {name} (needs messages access)", { name: r.label })}
            disabled={!canRemind(r) || busy}
            onClick={() => void remind(r)}
          />
        )
      }
    />
  );
  const anyRow = (r: RenewalDue | ExpiredRow, i: number) =>
    isExpired(r) ? <WebDeskRow key={r.membershipId} icon={CircleAlert} title={r.label} sub={expiredSub(r.daysAgo)} first={i === 0} trailing={<WebChip tone="high">{t("Expired")}</WebChip>} /> : row(r, i);

  const chase = !!menuFor && !menuFor.alreadyRenewed && !menuFor.cancelAtPeriodEnd;
  const offline = online ? undefined : t("You're offline");

  let left: React.ReactNode;
  if (loading && renewals.length === 0) {
    left = (
      <>
        <WebSectionLabel>{t("Renewals due")}</WebSectionLabel>
        <WebPulse style={{ height: 240, borderRadius: 18 }} />
      </>
    );
  } else if (error && renewals.length === 0) {
    left = (
      <>
        <WebSectionLabel>{t("Renewals due")}</WebSectionLabel>
        <ErrorCard title={t("Couldn't load renewals")} onRetry={onRetry} />
      </>
    );
  } else if (none) {
    left = (
      <>
        <WebSectionLabel>{t("Renewals due")}</WebSectionLabel>
        <WebListLine>{t("None due")}</WebListLine>
      </>
    );
  } else {
    left = (
      <>
        <WebSectionLabel>{t("Renewals in the next 30 days")}</WebSectionLabel>
        <div data-fd-renewals style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <section style={{ flex: "none" }}>
            <WebGroupCaption>{t("This week")}</WebGroupCaption>
            {dueNow.length ? <WebListCard label={t("This week")}>{dueNow.map(anyRow)}</WebListCard> : <WebListLine>{t("None due")}</WebListLine>}
          </section>
          <section style={{ flex: "none" }}>
            <WebGroupCaption>{t("Later")}</WebGroupCaption>
            {later.length ? <WebListCard label={t("Later")}>{later.map(row)}</WebListCard> : <WebListLine>{t("None due")}</WebListLine>}
          </section>
        </div>
      </>
    );
  }

  return (
    <div data-fd-passes style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: cols, gridTemplateRows: "minmax(0,1fr)", gap: GAP }}>
      <div style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>{left}</div>
      <div style={{ minWidth: 0, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <PassCardWeb />
        {showDayPasses && (
          <>
            <WebSectionLabel>{t("Day passes this week")}</WebSectionLabel>
            <div data-fd-daypass style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gridAutoRows: "1fr", gap: 16, marginBottom: 14 }}>
              {[
                { l: t("Sold"), v: week2 ? String(week2.sold) : "–" },
                { l: t("Revenue"), v: week2 ? deskMoney(week2.revenue) : "–" },
                { l: t("Joined after"), v: "–" },
              ].map((b) => (
                <div key={b.l} style={{ borderRadius: 16, background: LIST_BG, padding: 16, minHeight: 70, boxSizing: "border-box", minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <p style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: b.v === "–" ? "#A79E93" : INK }}>{b.v}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: MUTED, overflowWrap: "break-word" }}>{b.l}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {unpaid.length > 0 && (
          <>
            <WebSectionLabel>{t("Day passes to collect")}</WebSectionLabel>
            <WebListCard label={t("Day passes to collect")}>
              {unpaid.map((sale, i) => (
                <WebDeskRow
                  key={sale.id}
                  icon={Banknote}
                  title={saleWho(sale)}
                  sub={`${sale.planName} · ${deskMoney(sale.amount)} · ${dayMonthYear(sale.soldOn)}`}
                  first={i === 0}
                  trailing={
                    <WebChipButton
                      tone="warn"
                      label={t("Mark paid")}
                      ariaLabel={t("Mark {name}'s {plan} paid", { name: saleWho(sale), plan: sale.planName })}
                      disabled={!online || busy || !canDesk}
                      onClick={() => void markSalePaid(sale)}
                    />
                  }
                />
              ))}
            </WebListCard>
          </>
        )}
      </div>

      <WebMenu
        open={!!menuFor && !!anchor}
        anchor={anchor}
        onClose={() => setMenuFor(null)}
        align="end"
        label={menuFor ? menuFor.label : undefined}
        options={[
          ...(chase ? [{ value: "renew", label: t("Renew"), disabled: !online, note: offline }] : []),
          ...(chase && access.businessId && access.meets("messages") && menuFor?.personId ? [{ value: "remind", label: t("Send a reminder"), disabled: !online, note: offline }] : []),
          { value: "end", label: tx("End membership", "business"), destructive: true, disabled: !online, note: offline },
        ]}
        onSelect={(v) => {
          const r = menuFor;
          setMenuFor(null);
          if (!r) return;
          if (v === "renew") void renew(r);
          if (v === "remind") void remind(r);
          if (v === "end") setEnding(r);
        }}
      />
      <EndPopupWeb
        key={ending?.membershipId ?? "none"}
        ending={ending}
        terms={ending ? planTerms?.get(ending.planName) ?? null : null}
        online={online}
        onClose={() => setEnding(null)}
        onDone={(r, status) => {
          setEnding(null);
          showToast(status === "cancelled" ? t("{name}'s membership has ended.", { name: r.label }) : t("{name}'s membership ends on {date}.", { name: r.label, date: dayMonthYear(r.expiresOn) }));
          onChanged();
        }}
      />
    </div>
  );
};

/** The Member QR pass card: #F7F7FC r20, padding 16, gap 14; the 112 illustration, title 17/24 800, body 13/20 #5B5349. */
const QR_CELLS: boolean[] = (() => {
  let h = 0x5eed;
  return Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) return true;
    h = (h * 1103515245 + 12345) >>> 0;
    return (h >> 16) % 2 === 0;
  });
})();

const PassCardWeb: React.FC = () => (
  <div data-fd-passcard style={{ flex: "none", borderRadius: 20, background: LIST_BG, padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
    <div aria-hidden style={{ flex: "none", width: 112, height: 112, boxSizing: "border-box", borderRadius: 12, background: "#FFFFFF", padding: 7, display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 1 }}>
      {QR_CELLS.map((on, i) => (
        <span key={i} style={{ background: on ? INK : "#FFFFFF", borderRadius: 1 }} />
      ))}
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800 }}>{t("Member QR pass")}</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: INK2 }}>{t("Each member has a pass in their app. It scans at the door and works offline.")}</p>
    </div>
  </div>
);

/**
 * WB-FD.2.1 End membership? (440 popup): end_gym_membership at the end of the
 * paid period (the default) or now, an optional reason (500), the plan's
 * terms shown, never enforced. The mobile EndPopup's logic and copy.
 */
const EndPopupWeb: React.FC<{
  ending: RenewalDue | null;
  terms: string[] | null;
  online: boolean;
  onClose: () => void;
  onDone: (r: RenewalDue, status: string) => void;
}> = ({ ending, terms, online, onClose, onDone }) => {
  const [now, setNow] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const until = ending ? dayMonthYear(ending.expiresOn) : "";
  const run = async () => {
    if (!ending || busy) return;
    setBusy(true);
    setError(null);
    const r = await endGymMembership(ending.membershipId, !now, reason);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onDone(ending, r.value);
  };
  const choice = (on: boolean, label: string, sub: string, pick: () => void) => (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={pick}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
      style={{ width: "100%", textAlign: "start", borderRadius: 14, border: `1.5px solid ${on ? LAV : "rgba(36,31,27,0.11)"}`, background: on ? TINT : "transparent", padding: "10px 12px", minHeight: 44, boxSizing: "border-box", cursor: "pointer" }}
    >
      <span style={{ display: "block", fontSize: 15, lineHeight: "22px", fontWeight: 800, color: INK }}>{label}</span>
      <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: INK2 }}>{sub}</span>
    </button>
  );
  return (
    <WebPopup
      open={!!ending}
      onClose={onClose}
      icon={XCircle}
      tone="high"
      title={ending ? t("End {name}’s membership?", { name: ending.label }) : ""}
      body={now ? t("Their pass stops working straight away.") : t("Their pass stops working at the end of the paid period, on {date}.", { date: until })}
      confirm={{ label: busy ? t("Ending…") : tx("End membership", "business"), onClick: () => void run(), destructive: true, disabled: !online || busy }}
      cancel={{ label: t("Keep it") }}
    >
      <div style={{ alignSelf: "stretch", textAlign: "start", marginTop: 12 }}>
        {terms && terms.length > 0 && (
          <p style={{ margin: "0 0 10px", textAlign: "center", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: INK2 }}>{t("Plan terms: {terms}", { terms: terms.join(" · ") })}</p>
        )}
        <div role="radiogroup" aria-label={t("When it ends")} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {choice(!now, t("At the end of the paid period"), t("They keep their pass until {date}.", { date: until }), () => setNow(false))}
          {choice(now, t("Now"), t("Their pass stops working today."), () => setNow(true))}
        </div>
        <label htmlFor="fd-web-end-reason" style={{ display: "block", margin: "12px 0 6px", fontSize: 13, lineHeight: "16px", fontWeight: 700, color: INK2 }}>
          {t("Reason (optional)")}
        </label>
        <input
          id="fd-web-end-reason"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("For your records")}
          className="focus:outline-none focus:!border-[#AEA1DC] placeholder:text-[#8C8378] placeholder:font-medium"
          style={{ width: "100%", height: 44, boxSizing: "border-box", borderRadius: 14, background: "#F5F5F6", border: "1.5px solid rgba(36,31,27,0.11)", padding: "0 12px", fontSize: 15, fontWeight: 700, color: INK }}
        />
        {!online && (
          <p role="status" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: MUTED }}>
            {t("You're offline.")}
          </p>
        )}
        {error && (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
            {error}
          </p>
        )}
      </div>
    </WebPopup>
  );
};


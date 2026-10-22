import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { FilterPopup, FilterSummary, FilterTrigger } from "../../../components/market/FilterPopup";
import { useFilter } from "../../../components/market/useFilter";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { TicketStub } from "../../../components/market/TicketStub";
import { FOCUS_CSS, usePress } from "../../../components/market/usePress";
import { initialsOf } from "../../../components/market/peopleModel";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { useIsDark } from "../../../hooks/useIsDark";
import { fetchNotifications, markRead } from "../../../services/pro/notifications";
import { fetchMyApplications, fetchOpportunities, inviteFromNotification, type Opportunity } from "../../../services/team-hiring";
import type { ExistingTeamInvite } from "../../../services/hiring/model";
import { TextLink, lh, px, useMarketColors } from "../../business-market/listingParts";
import { ApplySheet } from "./opportunities/ApplySheet";
import { ExistingTeamInviteDialog } from "./opportunities/ExistingTeamInvite";
import { OpEmpty } from "./opportunities/parts";
import { fixedPair } from "./opportunities/colours";
import { useActionStrip } from "./opportunities/useActionStrip";
import {
  OP_FILTER_GROUPS,
  classTicket,
  countLine,
  filterQueries,
  inviteExpired,
  longDate,
  mergeOpportunities,
  offeredCount,
  payLine,
  postedLine,
  ratingDistance,
  scheduleLine,
  toDate,
  typeText,
  type OpportunityExtras,
} from "./opportunities/opportunitiesModel";

// Market + Share 3.0 · W4 · P-MA.5.1 Openings, the body of the P-MA
// "Opportunities" tab (HANDOVER §4 "P-MA.5.1 Opportunities"; Professional
// Marketplace Screens lines 340–409 and the `op`, `opTabs`, `trig`,
// `gymOpen`, `classOpen`, `FG`, `filter` script; frame-check P-MA.5.1: Gyms,
// Classes, Filter popup, No matches). Padding 0 16 32 (the app column gives
// the 16):
// 1. the two buttons (grid 1fr 1fr, gap 5, padding 6, radius 16, --segtrack;
//    40 tall, radius 12, --segidle / --segink 13 / 700): "My applications"
//    with the 18 badge (#5A859E / #FFFFFF 10 / 800) counting the offers
//    waiting (my_applications OFFERED) → /opportunities/applications; "My
//    work" → /opportunities/work;
// 2. margin-top 12, gap 8: the Gyms · Classes track (--subtrack, radius 12,
//    padding 4, gap 4; tabs 32 tall radius 9, 12.5, active --subactive /
//    --onfill 700, idle --subink 600) and the 40 filter trigger (FilterPopup
//    "pro": Type, Specialty, Distance; Done), the shared FilterPopup +
//    filterModel + useFilter as C-MO.4.3; the summary chip + "Show all";
// 3. the count line (margin-top 12, 11.5 --faint);
// 4. Gyms: cards (radius 20, --card, 1px --border): the 44 initials tile, the
//    gym 12 / 600 --accent, the title 15 / 800 / 20, the star + "4.8 · 0.8 km"
//    11.5 --faint; the --soft rows box (margin 0 16, radius 14, padding
//    4 12) Type / Pay / Schedule (12; key --faint, value 700); "Posted … ·
//    N positions" and Apply (36 tall, radius 11, padding 0 16, --fill /
//    --onfill 13 / 800) → the Apply sheet; once sent the button reads
//    "Applied". Classes: the ticket stubs (radius 18, 0.5px --hair) with the
//    time column, the type eyebrow, the title, "gym · day", the slot line and
//    the 72 pay stub (--pale, the pay 18 / 800 + "pay" 10 / 700 --pdark);
//    tapping one opens the Apply sheet (the ticket is the board's only
//    control there). Empty: "No openings match" + Clear filters.
// opportunities() is DB8 (+ DB11 open_to_gym_work): pending, the W3 quiet
// "coming soon" card keeps "Gyms and colleagues" (ProfessionalExplore, D-39)
// reachable; once openings load, a quiet "Gyms and colleagues" link stays
// under the list. An existing-team invite reaching the professional here
// (router state from the P-MA.7 row, or an unread existing_team_invite
// notification) opens P-MA.5.4.

const HOME = "/app/pro/marketplace";
type Tab = "gyms" | "classes";
type ListState = { status: "loading" } | { status: "pending" } | { status: "error" } | { status: "ok"; list: Opportunity[] };
type Loaded = { key: string; s: ListState };

export function OpportunitiesTab() {
  const m = useMarketColors();
  const dark = useIsDark();
  const navigate = useNavigate();
  const location = useLocation();
  const filter = useFilter();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [tab, setTab] = useState<Tab>("gyms");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [tick, setTick] = useState(0);
  const [offers, setOffers] = useState(0);
  const [applyTo, setApplyTo] = useState<Opportunity | null>(null);
  const [applied, setApplied] = useState<ReadonlySet<string>>(new Set());
  const [strip, showStrip] = useActionStrip();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  const selectedKey = filter.selected.join("|");

  const loadKey = `${tab}|${selectedKey}|${tick}`;
  // The answer for the current tab / filter / retry, else loading.
  const state: ListState = loaded?.key === loadKey ? loaded.s : { status: "loading" };
  useEffect(() => {
    let alive = true;
    const setState = (st: ListState) => setLoaded({ key: loadKey, s: st });
    const queries = filterQueries(selectedKey ? selectedKey.split("|") : []);
    // awaiting DB stage DB8 (opportunities; DB11 open_to_gym_work)
    void Promise.all(queries.map((q) => fetchOpportunities(tab, q))).then((rs) => {
      if (!alive) return;
      if (rs.some((r) => !r.ok && r.pending)) return setState({ status: "pending" });
      const lists: Opportunity[][] = [];
      for (const r of rs) {
        if (!r.ok) return setState({ status: "error" });
        lists.push(r.value);
      }
      setState({ status: "ok", list: mergeOpportunities(lists, tab) });
    });
    return () => {
      alive = false;
    };
  }, [tab, selectedKey, loadKey]);

  useEffect(() => {
    let alive = true;
    // awaiting DB stage DB8 (my_applications): pending → no badge.
    void fetchMyApplications().then((r) => alive && setOffers(r.ok ? offeredCount(r.value) : 0));
    return () => {
      alive = false;
    };
  }, [tick]);

  // ---- existing-team invites reaching the professional here (P-MA.5.4)
  const routed = (location.state as { existingTeamInvite?: ExistingTeamInvite } | null)?.existingTeamInvite ?? null;
  const [invite, setInvite] = useState<{ invite: ExistingTeamInvite; notificationId: string | null } | null>(null);
  const [waiting, setWaiting] = useState<{ invite: ExistingTeamInvite; notificationId: string }[]>([]);
  const [lastRouted, setLastRouted] = useState<ExistingTeamInvite | null>(null);
  if (routed && routed !== lastRouted) {
    setLastRouted(routed);
    setInvite({ invite: routed, notificationId: null });
  }
  useEffect(() => {
    if (!routed) return;
    // Consume the state so Back / reload don't reopen it.
    navigate(location.pathname, { replace: true, state: null });
  }, [routed, navigate, location.pathname]);
  useEffect(() => {
    let alive = true;
    // awaiting DB stage DB12 (the existing_team_invite notification and its payload)
    void fetchNotifications().then((r) => {
      if (!alive || !r.ok) return;
      const now = new Date();
      const seen = new Set<string>();
      const list: { invite: ExistingTeamInvite; notificationId: string }[] = [];
      for (const n of r.data) {
        if (n.readAt) continue;
        const inv = inviteFromNotification(n);
        if (!inv || inv.acceptedAt || seen.has(inv.id) || inviteExpired(inv, now)) continue;
        seen.add(inv.id);
        list.push({ invite: inv, notificationId: n.id });
      }
      setWaiting(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const j = i === 0 ? 1 : 0;
    setTab(j === 0 ? "gyms" : "classes");
    tabRefs.current[j]?.focus();
  };

  const isApplied = (o: Opportunity) => o.applied || applied.has(o.id);
  const markApplied = (o: Opportunity) => setApplied((s) => new Set(s).add(o.id));
  const [badgeBg, badgeInk] = dark ? [fixedPair("#EBF2F4", "#5A859E", true)[1], m.onfill] : ["#5A859E", "#FFFFFF"];
  const list = state.status === "ok" ? state.list : [];

  const twoButtons = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
      <button type="button" onClick={() => navigate(`${HOME}/opportunities/applications`)} className="market-focus" style={segBtn(m)} aria-label={offers ? `My applications, ${offers} ${offers === 1 ? "offer" : "offers"} waiting` : undefined}>
        My applications
        {offers > 0 ? (
          <span aria-hidden style={{ minWidth: 18, height: 18, borderRadius: 999, background: badgeBg, color: badgeInk, fontSize: px(10), fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", boxSizing: "border-box" }}>
            {offers}
          </span>
        ) : null}
      </button>
      <button type="button" onClick={() => navigate(`${HOME}/opportunities/work`)} className="market-focus" style={segBtn(m)}>
        My work
      </button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {waiting.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {waiting.map((w) => (
            <InviteRow key={w.invite.id} invite={w.invite} onOpen={() => setInvite(w)} />
          ))}
        </div>
      ) : null}
      {twoButtons}
      {state.status === "pending" ? (
        <OpEmpty icon="briefcase" title="Openings from gyms are coming soon" body="Gyms will post roles and class slots here. Until then, find gyms and colleagues in Explore." cta="Gyms and colleagues" onCta={() => navigate("/app/marketplace")} />
      ) : (
        <>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <div role="tablist" aria-label="Openings" style={{ flex: 1, display: "flex", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
              {(["gyms", "classes"] as const).map((t, i) => {
                const on = t === tab;
                return (
                  <button
                    key={t}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setTab(t)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className="hit market-focus"
                    style={{ flex: 1, height: 32, borderRadius: 9, border: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(12.5), fontWeight: on ? 700 : 600, background: on ? m.subactive : "transparent", color: on ? m.onfill : m.subink, fontFamily: "inherit", cursor: "pointer", padding: 0 }}
                  >
                    {t === "gyms" ? "Gyms" : "Classes"}
                  </button>
                );
              })}
            </div>
            <FilterTrigger ref={setAnchor} active={filter.active} open={filter.open} onPress={filter.toggleFilter} label="Filter openings" variant="pro" />
          </div>
          {filter.active ? <FilterSummary summary={filter.summary} onShowAll={filter.clearFilter} style={{ marginTop: 10 }} /> : null}
          <FilterPopup open={filter.open} anchor={anchor} groups={OP_FILTER_GROUPS} selected={filter.selected} onToggle={filter.toggleOption} onClose={filter.closeFilter} variant="pro" />
          <MarketOffline loaded={state.status === "ok"} onRetry={retry} style={{ marginTop: 12 }} />
          {state.status === "loading" ? (
            <MarketSkeleton radius={tab === "gyms" ? 20 : 18} rows={3} count={3} height={tab === "gyms" ? 252 : 112} gap={tab === "gyms" ? 10 : 14} label="Loading openings" style={{ marginTop: 22 }} />
          ) : state.status === "error" ? (
            <MarketError thing="openings" onRetry={retry} style={{ marginTop: 12 }} />
          ) : (
            <>
              <div role="status" style={{ marginTop: 12, fontSize: px(11.5), color: m.faint }}>
                {countLine(tab, list.length, filter.active)}
              </div>
              {list.length === 0 ? (
                <OpEmpty
                  icon="search"
                  title="No openings match"
                  body="Try fewer filters or check back later. Gyms near you post new roles and class slots here."
                  cta={filter.active ? "Clear filters" : undefined}
                  onCta={filter.active ? filter.clearFilter : undefined}
                />
              ) : tab === "gyms" ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.map((o) => (
                    <GymCard key={o.id} o={o} applied={isApplied(o)} onApply={() => setApplyTo(o)} />
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 14 }}>
                  {list.map((o) => (
                    <ClassTicket key={o.id} o={o} applied={isApplied(o)} onApply={() => setApplyTo(o)} />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
                <TextLink onClick={() => navigate("/app/marketplace")}>Gyms and colleagues</TextLink>
              </div>
            </>
          )}
        </>
      )}
      <ApplySheet
        opening={applyTo}
        onClose={() => setApplyTo(null)}
        onSent={(o) => {
          setApplyTo(null);
          markApplied(o);
          showStrip(o.businessName ? `Application sent · ${o.businessName}` : "Application sent");
        }}
        onAlreadyApplied={markApplied}
      />
      {invite ? (
        <ExistingTeamInviteDialog
          invite={invite.invite}
          onClose={() => setInvite(null)}
          onDone={(inv) => {
            const nid = invite.notificationId;
            setInvite(null);
            setWaiting((w) => w.filter((x) => x.invite.id !== inv.id));
            if (nid) void markRead([nid]);
            showStrip(inv.businessName ? `You joined ${inv.businessName}'s team` : "You joined the team");
          }}
        />
      ) : null}
      {strip}
    </div>
  );
}

const segBtn = (m: ReturnType<typeof useMarketColors>): React.CSSProperties => ({
  height: 40,
  minHeight: 40,
  borderRadius: 12,
  border: 0,
  background: m.segidle,
  color: m.segink,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: px(13),
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  padding: "0 6px",
});

/** An existing-team invite waiting here (undrawn entry; the pale note's look): opens P-MA.5.4. */
function InviteRow({ invite, onOpen }: { invite: ExistingTeamInvite; onOpen: () => void }) {
  const m = useMarketColors();
  const by = toDate(invite.expiresAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="market-focus"
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, borderRadius: 16, background: m.pale, padding: "12px 14px", border: 0, textAlign: "left", font: "inherit", color: m.pdark, cursor: "pointer" }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700 }}>{`Join ${invite.businessName || "a gym"}'s team?`}</span>
        {by ? <span style={{ display: "block", fontSize: px(11.5), lineHeight: lh(16), fontWeight: 600 }}>{`Accept by ${longDate(by)} · free`}</span> : null}
      </span>
      <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ flexShrink: 0, ...NO_ICON_SCALE }} />
    </button>
  );
}

function GymCard({ o, applied, onApply }: { o: Opportunity; applied: boolean; onApply: () => void }) {
  const m = useMarketColors();
  const press = usePress();
  const rd = ratingDistance(o);
  const schedule = scheduleLine(o);
  const rows: [string, string][] = [["Type", typeText(o.type)], ["Pay", payLine(o)]];
  if (schedule) rows.push(["Schedule", schedule]);
  return (
    <article aria-label={`${o.title}, ${o.businessName}`} style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", display: "flex", gap: 12, alignItems: "center" }}>
        <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(12.5), fontWeight: 800, color: m.accent, flexShrink: 0 }}>
          {initialsOf(o.businessName)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: px(12), fontWeight: 600, color: m.accent }}>{o.businessName}</div>
          <h3 style={{ fontSize: px(15), fontWeight: 800, lineHeight: lh(20), margin: 0 }}>{o.title}</h3>
          {rd.rating || rd.distance ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: px(11.5), color: m.faint, marginTop: 1 }}>
              {rd.rating ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill={m.gold} stroke={m.gold} strokeWidth="1.5" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ) : null}
              <span>
                {rd.rating ? <span aria-label={`Rated ${rd.rating}`}>{rd.rating}</span> : null}
                {rd.rating && rd.distance ? " · " : null}
                {rd.distance}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <dl style={{ margin: "0 16px", borderRadius: 14, background: m.soft, padding: "4px 12px" }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: i ? `0.5px solid ${m.div}` : 0, fontSize: px(12) }}>
            <dt style={{ color: m.faint }}>{k}</dt>
            <dd style={{ margin: 0, fontWeight: 700, textAlign: "right" }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div style={{ padding: "12px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: px(11.5), color: m.faint }}>{postedLine(o.postedAt, o.positions, new Date())}</span>
        <button
          type="button"
          onClick={applied ? undefined : onApply}
          aria-disabled={applied || undefined}
          aria-label={applied ? `Applied to ${o.title}` : `Apply to ${o.title} at ${o.businessName}`}
          className="hit market-focus"
          {...(applied ? {} : press.handlers)}
          style={{ height: 36, padding: "0 16px", borderRadius: 11, border: 0, background: m.fill, color: m.onfill, display: "flex", alignItems: "center", fontSize: px(13), fontWeight: 800, fontFamily: "inherit", cursor: applied ? "default" : "pointer", flexShrink: 0, ...(applied ? {} : press.style) }}
        >
          {applied ? "Applied" : "Apply"}
        </button>
      </div>
    </article>
  );
}

function ClassTicket({ o, applied, onApply }: { o: Opportunity; applied: boolean; onApply: () => void }) {
  const m = useMarketColors();
  const t = classTicket(o as Opportunity & OpportunityExtras);
  return (
    <TicketStub
      stubWidth={72}
      tone="pale"
      minHeight={88}
      onPress={applied ? undefined : onApply}
      ariaLabel={applied ? `${o.title}, ${t.place}. Applied` : `${o.title}, ${t.place}. Apply`}
      className="market-focus"
      stub={
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: m.pdark }}>
          <span style={{ fontSize: px(18), fontWeight: 800 }}>{t.pay ?? "–"}</span>
          <span style={{ fontSize: px(10), fontWeight: 700 }}>{applied ? "applied" : "pay"}</span>
        </span>
      }
      bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, boxSizing: "border-box" }}
    >
      <span style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ width: 64, flexShrink: 0 }}>
          <span style={{ display: "block", fontSize: px(16), lineHeight: lh(22), fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {t.time ? (
              <>
                {t.time.time}
                <span style={{ fontSize: px(11), lineHeight: 1, fontWeight: 700 }}>{` ${t.time.meridiem}`}</span>
              </>
            ) : null}
          </span>
          {t.dur ? <span style={{ display: "block", fontSize: px(12), lineHeight: lh(16), color: m.faint }}>{t.dur}</span> : null}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {t.eyebrow ? <span style={{ display: "block", fontSize: px(11), fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: m.faint }}>{t.eyebrow}</span> : null}
          <span style={{ display: "block", fontSize: px(15), lineHeight: lh(21), fontWeight: 700 }}>{t.title}</span>
          <span style={{ display: "block", fontSize: px(12.5), lineHeight: lh(17), fontWeight: 500, color: m.ink2 }}>{t.place}</span>
        </span>
      </span>
      <span style={{ display: "block", fontSize: px(11), lineHeight: lh(15), color: m.faint }}>{t.spots}</span>
    </TicketStub>
  );
}

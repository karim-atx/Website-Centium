import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TicketStub } from "../../../../components/market/TicketStub";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../../components/market/MarketStates";
import { FOCUS_CSS, usePress } from "../../../../components/market/usePress";
import { initialsOf } from "../../../../components/market/peopleModel";
import { useBack } from "../../../../hooks/useBack";
import { useIsDark } from "../../../../hooks/useIsDark";
import { useOnline } from "../../../../hooks/useOnline";
import { acceptHireOffer, clashesOf, declineHireOffer, fetchMyApplications, type Clash, type MyApplication } from "../../../../services/team-hiring";
import { BackHeader, CentredDialog, SoonNote, lh, px, useMarketColors } from "../../../business-market/listingParts";
import { DialogRows, InitialsTile, OpEmpty } from "./parts";
import { ConflictDialog } from "../../../../components/pro/calendar/ConflictDialog";
import { fixedInk } from "./colours";
import { useActionStrip } from "./useActionStrip";
import { acceptBody, acceptRows, applicationMeta, clashBody, clashTime, hiredStrip, offerNote, roleLine, STATUS_TONE } from "./opportunitiesModel";

// Market + Share 3.0 · W4 · P-MA.5.2 My applications
// (/app/pro/marketplace/opportunities/applications; Professional Marketplace
// Screens lines 411–444 and the `A()`, `apps`, `strip`, `dlg` (apOffer)
// script; frame-check P-MA.5.2 Application sent / Statuses · OFFERED to
// accept / Accept a direct offer / You're hired / Empty). The back header
// "Opportunities / My applications"; the list (gap 12) of ticket stubs:
// radius 18, --card, 0.5px --hair (OFFERED 1.5px #5A859E, just hired 1.5px
// #4F8F8A), min-height 104; the body (padding 12 14): the 44 initials tile,
// the gym 12 / 600 --accent, "{title} · Role" 14 / 700 / 19, the meta 11.5
// --faint; OFFERED cards add the note (12 / 17 --ink2, margin-top 10) and
// Accept (--fill / --onfill 13 / 800) / Decline (1px --border, --ink2 13 / 700),
// 38 tall radius 11 (margin-top 10, gap 8); the 46 vertical stub with the
// status (9.5 / 800, 0.12em) in its STATUS_STEPS colours (DECLINED muted,
// perforation --border).
// Accept → CentredDialog "Accept this offer?" (gym, role, pay, starts,
// classes a month; "Pay is arranged between you and {gym}. Centium charges you
// nothing."; Not now / Accept offer) → accept_hire_offer. A `conflicts`
// refusal opens the clash dialog (P-CA.5.5's copy and rows: the warning
// tile, "This overlaps your calendar", the clashing titles and times, Go back
// / Accept anyway → p_ack_conflicts true) in P-CA.5.5's ConflictDialog
// (components/pro/calendar, W5). Hired → the card turns HIRED and the
// strip "You're hired · {gym}, {role}" with "My work". Decline →
// decline_hire_offer (one tap: the board draws no confirm).
// Database Release 2: there is no my_applications reader, so the list is
// my_hire_offers + the caller's own opening_applications (services/team-hiring);
// accept_hire_offer (ATXH15 → the clash dialog, its rows from check_conflicts)
// and decline_hire_offer (ATXH14 / ATX08 → "This offer is no longer open.").

const HOME = "/app/pro/marketplace";
type State = { status: "loading" } | { status: "pending" } | { status: "error" } | { status: "ok"; list: MyApplication[] };

export default function MyApplicationsPage() {
  const m = useMarketColors();
  const navigate = useNavigate();
  const online = useOnline();
  const back = useBack(`${HOME}/opportunities`);
  const [state, setState] = useState<State>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [hiredNow, setHiredNow] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<MyApplication | null>(null);
  const [clash, setClash] = useState<{ app: MyApplication; clashes: Clash[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [dlgSoon, setDlgSoon] = useState(false);
  const [declining, setDeclining] = useState<string | null>(null);
  const [strip, showStrip] = useActionStrip();
  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    // My applications: my_hire_offers + the caller's own opening_applications (services/team-hiring).
    void fetchMyApplications().then((r) => {
      if (!alive) return;
      setState(r.ok ? { status: "ok", list: r.value } : r.pending ? { status: "pending" } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const setStatus = (id: string, status: MyApplication["status"]) =>
    setState((s) => (s.status === "ok" ? { status: "ok", list: s.list.map((a) => (a.id === id ? { ...a, status } : a)) } : s));

  const closeDialogs = () => {
    setAccepting(null);
    setClash(null);
    setDlgError(null);
    setDlgSoon(false);
  };

  const accept = async (a: MyApplication, ack: boolean) => {
    if (busy) return;
    if (!online) return setDlgError("You're offline. Try again when you're connected.");
    setBusy(true);
    setDlgError(null);
    setDlgSoon(false);
    const r = await acceptHireOffer(a.offerId ?? a.id, ack);
    setBusy(false);
    if (r.ok) {
      closeDialogs();
      setStatus(a.id, "HIRED");
      setHiredNow(a.id);
      showStrip(hiredStrip(a), { action: "My work", onAction: () => navigate(`${HOME}/opportunities/work`, { state: { hired: { gym: a.businessName, startsOn: a.startsOn } } }) });
      return;
    }
    if (r.pending) return setDlgSoon(true);
    if (r.error === "conflicts" && !ack) {
      setAccepting(null);
      setClash({ app: a, clashes: clashesOf(r.details) });
      return;
    }
    if (r.error === "offer_closed") retry();
    setDlgError(r.message);
  };

  const decline = async (a: MyApplication) => {
    if (declining) return;
    if (!online) return showStrip("You're offline. Try again when you're connected.", { tone: "neutral" });
    setDeclining(a.id);
    const r = await declineHireOffer(a.offerId ?? a.id);
    setDeclining(null);
    if (r.ok) {
      setStatus(a.id, "DECLINED");
      return showStrip(a.businessName ? `Offer declined · ${a.businessName}` : "Offer declined");
    }
    if (r.pending) return showStrip("Hiring is coming soon.", { tone: "neutral" });
    if (r.error === "offer_closed") retry();
    showStrip(r.message, { tone: "error" });
  };

  const browse = () => navigate(`${HOME}/opportunities`);
  const now = new Date();

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow="Opportunities" title="My applications" onBack={back} backLabel="Back to Opportunities" />
      <MarketOffline loaded={state.status === "ok"} onRetry={retry} style={{ marginBottom: 12 }} />
      {state.status === "loading" ? (
        <MarketSkeleton radius={18} rows={3} count={3} height={104} gap={12} label="Loading your applications" />
      ) : state.status === "error" ? (
        <MarketError thing="your applications" onRetry={retry} />
      ) : state.status === "pending" || state.list.length === 0 ? (
        <OpEmpty icon="send" top={56} title="No applications yet" body="Apply to an opening, or accept a direct offer from a gym. Each one shows here with its status." cta="Browse openings" onCta={browse} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {state.list.map((a) => (
            <ApplicationCard key={a.id} a={a} now={now} justHired={hiredNow === a.id} declining={declining === a.id} onAccept={() => setAccepting(a)} onDecline={() => void decline(a)} />
          ))}
        </div>
      )}
      {accepting ? (
        <CentredDialog
          open
          width={330}
          tone="primary"
          title="Accept this offer?"
          body={acceptBody(accepting.businessName)}
          cancel="Not now"
          action="Accept offer"
          busy={busy}
          error={dlgError}
          onCancel={closeDialogs}
          onAction={() => void accept(accepting, false)}
        >
          <DialogRows rows={acceptRows(accepting)} />
          {dlgSoon ? <SoonNote style={{ marginTop: 12 }}>Hiring is coming soon.</SoonNote> : null}
        </CentredDialog>
      ) : null}
      {/* W5 (P-CA.5.5): the calendar's ConflictDialog; the data stays accept_hire_offer's `conflicts` refusal. */}
      <ConflictDialog
        open={!!clash}
        body={clash ? clashBody(clash.app, Math.max(1, clash.clashes.length)) : ""}
        clashes={(clash?.clashes ?? []).map((c) => ({ title: c.title || "A session on your calendar", time: clashTime(c.start, c.end) }))}
        busy={busy}
        error={dlgError}
        onBack={closeDialogs}
        onAccept={() => clash && void accept(clash.app, true)}
      >
        {dlgSoon ? <SoonNote style={{ marginTop: 12 }}>Hiring is coming soon.</SoonNote> : null}
      </ConflictDialog>
      {strip}
    </div>
  );
}

function ApplicationCard({ a, now, justHired, declining, onAccept, onDecline }: { a: MyApplication; now: Date; justHired: boolean; declining: boolean; onAccept: () => void; onDecline: () => void }) {
  const m = useMarketColors();
  const dark = useIsDark();
  const press = usePress();
  const offered = a.status === "OFFERED";
  const border = offered ? `1.5px solid ${fixedInk("#5A859E", dark)}` : justHired ? `1.5px solid ${fixedInk("#4F8F8A", dark)}` : undefined;
  const btn: React.CSSProperties = { flex: 1, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(13), fontFamily: "inherit", cursor: "pointer" };
  return (
    <TicketStub
      stubWidth={46}
      vertical
      stubLabel={a.status}
      labelType={[9.5, "0.12em"]}
      tone={STATUS_TONE[a.status]}
      minHeight={104}
      border={border}
      ariaLabel={`${a.businessName}, ${roleLine(a)}. ${a.status}`}
      stubAriaLabel={a.status}
      bodyStyle={{ padding: "12px 14px" }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <InitialsTile text={initialsOf(a.businessName)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: px(12), fontWeight: 600, color: m.accent }}>{a.businessName}</div>
          <div style={{ fontSize: px(14), fontWeight: 700, lineHeight: lh(19) }}>{roleLine(a)}</div>
          <div style={{ fontSize: px(11.5), color: m.faint, marginTop: 1 }}>{applicationMeta(a, now)}</div>
        </div>
      </div>
      {offered ? (
        <>
          {offerNote(a) ? <div style={{ marginTop: 10, fontSize: px(12), lineHeight: lh(17), color: m.ink2 }}>{offerNote(a)}</div> : null}
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="button" onClick={onAccept} className="hit market-focus" {...press.handlers} style={{ ...btn, border: 0, background: m.fill, color: m.onfill, fontWeight: 800, ...press.style }}>
              Accept
            </button>
            <button type="button" onClick={onDecline} disabled={declining} aria-busy={declining || undefined} className="hit market-focus" style={{ ...btn, background: "transparent", border: `1px solid ${m.border}`, color: m.ink2, fontWeight: 700, opacity: declining ? 0.4 : 1 }}>
              Decline
            </button>
          </div>
        </>
      ) : null}
    </TicketStub>
  );
}

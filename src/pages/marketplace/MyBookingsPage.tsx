import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, MoreVertical, QrCode } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { TicketStub } from "../../components/market/TicketStub";
import { MarketError, MarketOffline, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { MembershipPass } from "../../components/marketplace/MembershipPass";
import { ConfirmationStrip } from "../../components/market/ConfirmationStrip";
import { InstructorReviewDialog } from "../../components/market/InstructorReviewDialog";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { fetchPastBookings, firstName, sentText, type PastBooking, type ReviewTarget } from "../../services/instructor-reviews";
import { endMyGymMembership, fetchMembershipTerms, type GymMembership } from "../../services/venues";
import { commitmentLines } from "../../services/venues/venueLogic";
import { BackTitle } from "./BackTitle";
import { loadMemberships, loadSchedule, type Loaded, type MembershipsData, type ScheduleData } from "./myBookingsData";
import {
  arrangeMemberships,
  BOOKINGS_EMPTY,
  BOOKINGS_TABS,
  classRow,
  hireRow,
  longDate,
  membershipRow,
  pastRows,
  sessionRow,
  splitSchedule,
  tabFromQuery,
  type BookingRow,
  type BookingsTab,
} from "./myBookingsModel";

// Market + Share 3.0 · W2 · My bookings (C-MO.4.5 `bookMembers`,
// `bookUpcoming`, `bookPast`, `bookEmpty`; Client Explore Screens lines
// 550–598, script `list`, `tabs()`, `STUB`, `bstub()`).
// - back row + "My bookings" 22 / 800 (BackTitle);
// - the segmented track (margin-top 10): --segtrack, radius 16, padding 6,
//   gap 5; each tab flex 1, 40 tall, padding 0 10, radius 12, 13 / 700;
//   active --segactive / --onfill, idle --segidle / --segink;
// - the list (margin-top 14, gap 10): TicketStub 46 vertical (bstub: label
//   9.5 / 0.1em, min height 96); the body padding 12 14, gap 12: the 44 tile
//   radius 12 --pale with the initials 12.5 / 800 --accent, the name 14 / 700,
//   the sub 12 / 600 --accent, the meta 11.5 --faint (margin-top 1);
// - the empty state (bookEmpty): padding 56 24 0, gap 10, centred: the 56
//   tile radius 18 --pale with the calendar 24 (stroke 1.75) --accent, the
//   title 16 / 800, the body 13 / 1.55 --faint, the CTA (margin-top 6, min
//   height 40, radius 12, 1px --border, padding 0 14, 12.5 / 800 --pdark).
// Composed client-side from the live readers (myBookingsData.ts): DB4
// my_bookings is optional and hasn't landed.
// W5 (C-MO.4.5 `revPrompt` / `revFilled` / `revSent`; D-43): Past reads
// my_bookings(p_tab 'past') (DB4 `reviewable` / `reviewed`, awaiting); when it
// answers, Past is its rows and a past class taught by a Team instructor has
// the teal "Review" stub (a button) → InstructorReviewDialog; once sent the
// row reads "you rated N" with the muted "Reviewed" stub, and the strip
// "Review sent · it shows on {first}'s profile with {gym}" (Client
// Professional Screens line 192: margin-top 12 under the track, --goodbg,
// the "View" stub → the instructor's profile; closes after 5 s as useStrip)
// shows above the list. While my_bookings is pending, Past stays the
// composed rows with no Review stub.
// D-46: an active membership's row has a ⋮ (32 × 44) with "Show pass" (the
// live MembershipPass in a popup, as GymPage) and "End membership": the live
// end_gym_membership flow (MembershipsCard: at the period end or today) as a
// two-step CentredDialog (HANDOVER §4: destructive dialogs are always two
// steps).

const TAB_IDS: Record<BookingsTab, string> = { memberships: "bk-tab-memberships", upcoming: "bk-tab-upcoming", past: "bk-tab-past" };

export default function MyBookingsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const online = useOnline();
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = tabFromQuery(params.get("tab"));
  const setTab = (t: BookingsTab) => setParams({ tab: t }, { replace: true });

  const [members, setMembers] = useState<Loaded<MembershipsData> | null>(null);
  const [schedule, setSchedule] = useState<Loaded<ScheduleData> | null>(null);
  const [tick, setTick] = useState(0);
  /** my_bookings past (DB4): undefined while reading, null when pending or failed (Past stays composed). */
  const [pastDb, setPastDb] = useState<PastBooking[] | null | undefined>(undefined);
  /** Reviews sent this session: booking id → the rating given. */
  const [sent, setSent] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState<ReviewTarget | null>(null);
  const [strip, setStrip] = useState<{ n: number; text: string; professionalId: string } | null>(null);
  const reduced = useReducedMotion();
  /** Ended at the period end this session (MembershipsCard's rule, until the reader says so). */
  const [endsOn, setEndsOn] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setMembers(null);
    setSchedule(null);
    setPastDb(undefined);
    void loadMemberships().then((r) => !cancelled && setMembers(r));
    void loadSchedule().then((r) => !cancelled && setSchedule(r));
    void fetchPastBookings().then((r) => !cancelled && setPastDb(r.ok ? r.value : null));
    return () => {
      cancelled = true;
    };
  }, [tick]);
  const retry = useCallback(() => setTick((t) => t + 1), []);

  const memberRows = useMemo<BookingRow[] | null>(() => {
    if (!members?.ok) return null;
    const v = members.value;
    return arrangeMemberships([...v.gyms.map((g) => membershipRow(g, endsOn[g.id])), ...v.hires.map((h) => hireRow(h, v.hireTypes.get(h.professionalId) ?? null))]);
  }, [members, endsOn]);
  const split = useMemo(() => {
    if (!schedule?.ok) return null;
    const now = new Date();
    return splitSchedule([...schedule.value.classes.map((c) => classRow(c, now)), ...schedule.value.sessions.map((s) => sessionRow(s, now))]);
  }, [schedule]);

  const pastFromDb = useMemo(() => (pastDb ? pastRows(pastDb, sent) : null), [pastDb, sent]);

  // The sent strip closes with View or after 5 s (useStrip's timing). The row
  // that had focus becomes a plain ticket, so focus moves to the strip's View.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!strip) return;
    stripRef.current?.querySelector("button")?.focus();
    const id = window.setTimeout(() => setStrip(null), 5000);
    return () => window.clearTimeout(id);
  }, [strip]);

  const gymById = useMemo(() => new Map((members?.ok ? members.value.gyms : []).map((g) => [g.id, g])), [members]);

  // The row menu, the pass and the end flow.
  const [menu, setMenu] = useState<{ g: GymMembership; anchor: HTMLElement } | null>(null);
  const [passFor, setPassFor] = useState<GymMembership | null>(null);
  const [ending, setEnding] = useState<GymMembership | null>(null);

  const state = tab === "memberships" ? members : tab === "past" ? (pastDb === undefined ? null : pastFromDb ? ({ ok: true } as const) : schedule) : schedule;
  const rows: BookingRow[] | null = tab === "memberships" ? memberRows : tab === "past" && pastFromDb ? pastFromDb : split ? (tab === "upcoming" ? split.upcoming : split.past) : null;
  const cachedAt = members?.ok ? members.value.cachedAt : null;

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : BOOKINGS_TABS.length - 1)) % BOOKINGS_TABS.length;
    setTab(BOOKINGS_TABS[n].key);
    tabsRef.current[n]?.focus();
  };

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{`${FOCUS_CSS}.bk-review button:focus-visible{outline:2px solid #AEA1DC;outline-offset:-2px}`}</style>
      <BackTitle title="My bookings" parent="/app/marketplace" />
      <div role="tablist" aria-label="My bookings" style={{ marginTop: 10, display: "flex", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
        {BOOKINGS_TABS.map((t, i) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              id={TAB_IDS[t.key]}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="bk-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className="market-focus hit"
              style={{ flex: 1, minWidth: 0, height: 40, padding: "0 10px", borderRadius: 12, border: 0, background: on ? m.segactive : m.segidle, color: on ? m.onfill : m.segink, display: "flex", alignItems: "center", justifyContent: "center", font: "inherit", fontSize: textPx(13), fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id="bk-panel" role="tabpanel" aria-labelledby={TAB_IDS[tab]}>
        {tab === "past" && strip ? (
          <div ref={stripRef} style={{ marginTop: 12 }}>
            <ConfirmationStrip
              key={strip.n}
              text={strip.text}
              action="View"
              onAction={() => {
                const id = strip.professionalId;
                setStrip(null);
                navigate(`/app/professionals/${encodeURIComponent(id)}`);
              }}
              still={reduced}
            />
          </div>
        ) : null}
        {tab === "memberships" && cachedAt ? <MarketOffline loaded force style={{ marginTop: 14 }} /> : null}
        {state === null ? (
          <MarketSkeleton radius={18} rows={3} height={98} count={2} label="Loading your bookings" style={{ marginTop: 14 }} />
        ) : !state.ok ? (
          !online || state.offline ? (
            <MarketOffline loaded={false} force onRetry={retry} style={{ marginTop: 14 }} />
          ) : (
            <MarketError thing="your bookings" onRetry={retry} style={{ marginTop: 14 }} />
          )
        ) : rows && rows.length === 0 ? (
          <BookingsEmpty tab={tab} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {(rows ?? []).map((r) => {
              const g = r.kind === "membership" ? gymById.get(r.refId) : undefined;
              const canEnd = !!g && g.status === "active" && !endsOn[g.id] && !(g.cancelAtPeriodEnd && g.expiresOn);
              const canPass = !!g && (g.status === "active" || g.status === "upcoming");
              return (
                <BookingTicket
                  key={r.key}
                  row={r}
                  onOpen={r.href ? () => navigate(r.href as string) : undefined}
                  menu={g && (canEnd || canPass) ? (anchor) => setMenu({ g, anchor }) : undefined}
                  menuOpen={!!g && menu?.g.id === g.id}
                  onReview={r.review ? () => setReviewing(r.review ?? null) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        width={200}
        align="right"
        rowLineHeight={16}
        options={[
          ...(menu && (menu.g.status === "active" || menu.g.status === "upcoming") ? [{ value: "pass", label: "Show pass", icon: <QrCode size={15} strokeWidth={1.75} /> }] : []),
          ...(menu && menu.g.status === "active" && !endsOn[menu.g.id] && !(menu.g.cancelAtPeriodEnd && menu.g.expiresOn)
            ? [{ value: "end", label: "End membership", icon: <LogOut size={15} strokeWidth={1.75} />, destructive: true }]
            : []),
        ]}
        onSelect={(v) => {
          const g = menu?.g ?? null;
          setMenu(null);
          if (v === "pass") setPassFor(g);
          else setEnding(g);
        }}
      />

      <CentredPopup open={!!passFor} onClose={() => setPassFor(null)} title={passFor?.gymName ?? ""} geometry="ours">
        {passFor && <MembershipPass membership={passFor} gymLocation={null} memberName={user.firstName} />}
        <button type="button" onClick={() => setPassFor(null)} className="tap mt-2 w-full h-12 text-[14px] font-bold text-th-7d67d9 dark:text-primary-accent">
          Done
        </button>
      </CentredPopup>

      <InstructorReviewDialog
        target={reviewing}
        onClose={() => setReviewing(null)}
        onSent={(t, rating) => {
          setReviewing(null);
          setSent((s) => ({ ...s, [t.bookingId]: rating }));
          setStrip((p) => ({ n: (p?.n ?? 0) + 1, text: sentText(t.professionalName, t.gymName), professionalId: t.professionalId }));
        }}
        onAlreadyReviewed={(t) => setPastDb((list) => (list ? list.map((b) => (b.refId === t.bookingId ? { ...b, reviewed: true } : b)) : list))}
      />

      <EndMembershipDialog
        membership={ending}
        onClose={() => setEnding(null)}
        onEnded={(g, status) => {
          setEnding(null);
          if (status === "active" && g.expiresOn) setEndsOn((e) => ({ ...e, [g.id]: g.expiresOn as string }));
          void loadMemberships().then((r) => r.ok && setMembers(r));
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

const BookingTicket: React.FC<{ row: BookingRow; onOpen?: () => void; menu?: (anchor: HTMLElement) => void; menuOpen: boolean; onReview?: () => void }> = ({ row, onOpen, menu, menuOpen, onReview }) => {
  const m = marketPalette(useIsDark());
  const press = usePress();
  const label = [row.title, row.sub, row.meta, row.note, row.stub].filter(Boolean).join(", ");
  const content = (
    <>
      <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(12.5), fontWeight: 800, color: m.accent, flexShrink: 0 }}>
        {row.tile}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "block" }}>
        <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700, color: m.ink }}>{row.title}</span>
        <span style={{ display: "block", fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{row.sub}</span>
        <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>{row.meta}</span>
        {row.note ? <span style={{ display: "block", fontSize: textPx(11.5), fontWeight: 600, color: m.ink2, marginTop: 1 }}>{row.note}</span> : null}
      </span>
    </>
  );
  const bodyBox: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", boxSizing: "border-box" };
  if (onReview) {
    // W5: the body opens the class, the teal "Review" stub opens the review popup.
    return (
      <TicketStub
        stubWidth={46}
        vertical
        labelType={[9.5, "0.1em"]}
        minHeight={98}
        tone={row.tone}
        stubLabel={row.stub}
        onPress={onOpen ?? onReview}
        onStubPress={onReview}
        ariaLabel={label}
        stubAriaLabel={row.review ? `Review ${firstName(row.review.professionalName)}'s class` : "Review"}
        className="bk-review"
        bodyStyle={bodyBox}
      >
        {content}
      </TicketStub>
    );
  }
  if (!menu) {
    return (
      <TicketStub stubWidth={46} vertical labelType={[9.5, "0.1em"]} minHeight={98} tone={row.tone} stubLabel={row.stub} onPress={onOpen} ariaLabel={label} className="market-focus" bodyStyle={bodyBox}>
        {content}
      </TicketStub>
    );
  }
  return (
    <TicketStub stubWidth={46} vertical labelType={[9.5, "0.1em"]} minHeight={98} tone={row.tone} stubLabel={row.stub} bodyStyle={{ display: "flex", alignItems: "stretch" }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="market-focus"
        {...press.handlers}
        style={{ ...bodyBox, flex: 1, minWidth: 0, paddingRight: 0, background: "none", border: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", ...press.style }}
      >
        {content}
      </button>
      <button
        type="button"
        onClick={(e) => menu(e.currentTarget)}
        aria-label={`Options for ${row.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="market-focus"
        style={{ width: 32, minHeight: 44, alignSelf: "center", flexShrink: 0, marginRight: 4, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: 0, borderRadius: 10, color: m.ink2, cursor: "pointer" }}
      >
        <MoreVertical size={16} aria-hidden style={NO_ICON_SCALE} />
      </button>
    </TicketStub>
  );
};

const BookingsEmpty: React.FC<{ tab: BookingsTab }> = ({ tab }) => {
  const m = marketPalette(useIsDark());
  const navigate = useNavigate();
  const e = BOOKINGS_EMPTY[tab];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "56px 24px 0" }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent }}>
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      </span>
      <h2 style={{ margin: 0, fontSize: textPx(16), fontWeight: 800, color: m.ink }}>{e.title}</h2>
      <p style={{ margin: 0, fontSize: textPx(13), lineHeight: 1.55, color: m.faint }}>{e.body}</p>
      <button
        type="button"
        onClick={() => navigate(e.href)}
        className="market-focus"
        style={{ marginTop: 6, minHeight: 42, borderRadius: 12, border: `1px solid ${m.border}`, background: "none", display: "inline-flex", alignItems: "center", padding: "0 14px", font: "inherit", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, cursor: "pointer" }}
      >
        {e.cta}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// End membership (D-46): the live end_gym_membership flow, as the
// CentredDialog (HANDOVER §4: width 330, radius 32, padding 24, 1px
// --sborder, shadow 0 18 48 rgba(95,80,147,0.22); title 20 / 26 800
// --stitle; body 13 / 19 500 --ink2; buttons 48 tall radius 14 14 / 700:
// cancel #F0EDF9 / #5F5093, destructive #C0392B / #FFFFFF; always two steps).
// Step 1 "End your membership?" chooses when (at the period end, the
// default, or today; MembershipsCard's choices and wording); step 2 "Confirm
// end" says what happens and ends it. The plan's commitment terms show as
// information, as on Profile. Errors stay on step 2.

const EndMembershipDialog: React.FC<{ membership: GymMembership | null; onClose: () => void; onEnded: (g: GymMembership, status: string) => void }> = ({ membership, onClose, onEnded }) => {
  const m = marketPalette(useIsDark());
  const [step, setStep] = useState<1 | 2>(1);
  const [atPeriodEnd, setAtPeriodEnd] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState<string[] | null>(null);
  const g = membership;
  useEffect(() => {
    setStep(1);
    setAtPeriodEnd(!!g?.expiresOn);
    setBusy(false);
    setError(null);
    setTerms(null);
    if (!g) return;
    let cancelled = false;
    void fetchMembershipTerms([g]).then((t) => {
      const x = t.get(g.id);
      if (!cancelled && x) {
        const lines = commitmentLines(x.minimumTermMonths, x.noticeDays);
        setTerms(lines.length ? lines : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [g]);
  const end = async () => {
    if (!g || busy) return;
    setBusy(true);
    setError(null);
    const r = await endMyGymMembership(g.id, atPeriodEnd && !!g.expiresOn);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onEnded(g, r.value);
  };
  const btn = (bg: string, ink: string): React.CSSProperties => ({ width: "100%", minHeight: 48, padding: "0 8px", borderRadius: 14, border: 0, background: bg, color: ink, font: "inherit", fontSize: textPx(14), fontWeight: 700, cursor: "pointer" });
  const option = (on: boolean): React.CSSProperties => ({
    width: "100%",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    textAlign: "left",
    padding: "11px 13px",
    borderRadius: 14,
    background: m.card,
    border: on ? `1.5px solid ${m.segactive}` : `0.5px solid ${m.border}`,
    font: "inherit",
    color: m.ink,
    cursor: "pointer",
  });
  const radio = (on: boolean): React.CSSProperties => ({ width: 20, height: 20, borderRadius: 999, boxSizing: "border-box", border: on ? `6px solid ${m.segactive}` : `1.5px solid ${m.border}`, flexShrink: 0, marginTop: 1 });
  const ends = g?.expiresOn ? longDate(g.expiresOn) : null;
  const confirmBody = !g
    ? ""
    : atPeriodEnd && ends
      ? `Your pass keeps working until ${ends}, then your membership at ${g.gymName} ends. The gym can see that you ended it.`
      : `Your membership at ${g.gymName} ends today and your pass stops working now. The gym can see that you ended it.`;
  return (
    <CentredPopup
      open={!!g}
      onClose={() => !busy && onClose()}
      title={step === 1 ? "End your membership?" : "Confirm end"}
      alert
      geometry="ours"
      maxWidth={330}
      titleClass="text-[20px] leading-[26px]"
      titleInk="text-[#7248F8] dark:text-[#C3B3FB]"
      className="!rounded-[32px] !p-6 border border-[#7248F8] dark:border-[#A991FE] !shadow-[0_18px_48px_rgba(95,80,147,0.22)] dark:!shadow-none"
      bodyWeight={500}
      body={
        <span style={{ display: "block", fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2 }}>
          {step === 1 ? (ends ? `${g?.planName} at ${g?.gymName}. Choose when it ends.` : `${g?.planName} at ${g?.gymName}.`) : confirmBody}
        </span>
      }
    >
      <div aria-hidden style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <span style={{ flex: 1, height: 4, borderRadius: 999, background: m.segactive }} />
        <span style={{ flex: 1, height: 4, borderRadius: 999, background: step === 2 ? m.segactive : m.soft }} />
      </div>
      {step === 1 ? (
        <>
          {ends ? (
            <div role="radiogroup" aria-label="When it ends" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" role="radio" aria-checked={atPeriodEnd} onClick={() => setAtPeriodEnd(true)} className="market-focus" style={option(atPeriodEnd)}>
                <span aria-hidden style={radio(atPeriodEnd)} />
                <span>
                  <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>End on {ends}</span>
                  <span style={{ display: "block", fontSize: textPx(11), color: m.faint }}>Your pass keeps working until then.</span>
                </span>
              </button>
              <button type="button" role="radio" aria-checked={!atPeriodEnd} onClick={() => setAtPeriodEnd(false)} className="market-focus" style={option(!atPeriodEnd)}>
                <span aria-hidden style={radio(!atPeriodEnd)} />
                <span>
                  <span style={{ display: "block", fontSize: textPx(14), fontWeight: 700 }}>End it today</span>
                  <span style={{ display: "block", fontSize: textPx(11), color: m.faint }}>Your pass stops now.</span>
                </span>
              </button>
            </div>
          ) : null}
          {terms ? (
            <p style={{ margin: "10px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.ink2, textAlign: "center" }}>Your plan's terms: {terms.join(" · ")}.</p>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={onClose} className="market-focus" style={btn(m.cancelbg, m.cancelink)}>
              Cancel
            </button>
            <button type="button" onClick={() => setStep(2)} className="market-focus" style={btn(m.high, m.onfill)}>
              Continue
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, padding: "10px 12px", background: m.cautionbg }}>
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: m.caution, marginTop: 6, flexShrink: 0 }} />
            <span style={{ fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.caution }}>This can't be undone from the app. To come back, buy a new membership.</span>
          </div>
          {error ? (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={() => setStep(1)} disabled={busy} className="market-focus" style={btn(m.cancelbg, m.cancelink)}>
              Back
            </button>
            <button type="button" onClick={() => void end()} disabled={busy} className="market-focus" style={{ ...btn(m.high, m.onfill), opacity: busy ? 0.6 : 1 }}>
              {busy ? "Ending…" : "End membership"}
            </button>
          </div>
        </>
      )}
    </CentredPopup>
  );
};

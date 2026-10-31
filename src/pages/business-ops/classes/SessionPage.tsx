import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, EllipsisVertical, UserRound } from "lucide-react";
import { ClassRosterSheet } from "../../../components/marketplace/ClassRosterSheet";
import { useMarkBookingPaid } from "../../../components/marketplace/useMarkBookingPaid";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { fetchClassRoster } from "../../../services/venues/console";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useApp } from "../../../context/AppContext";
import { isMaskedLabel, splitRoster, type RosterEntry } from "../../../services/venues/consoleLogic";
import { repeatLine } from "../../../services/business-classes/scheduleRules";
import { linePx, textPx } from "../../../theme/textSize";
import type { MarketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { BackHeader, Caps, Chip, useMarketColours } from "./parts";
import { useSessionActions } from "./SessionActions";
import { useSchedule } from "./useSchedule";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { classData } from "../../../components/share/business/bizCardModel";
import { fetchClassCreatedAt } from "../../../services/share-links";
import { addDays, dayWords, durationText, initialOf, isEnded, payMethodText, priceText, repeatsLine, shortDate, todayIso, whenText } from "./scheduleModel";

// Market + Share 3.0 · B-MA.6 Bookings (Business Marketplace Screens
// `classBookings`, markup lines 431–449; HANDOVER §4 "B-MA.6"): route
// /app/business/classes/:id. Back header "Classes" / {class name}; the line
// "{Fri, Oct 16, 6:30 PM} · {45 min} · {instructor}" 13 --ink2; two --soft
// tiles (radius 18, padding 12 14, gap 10, margin-top 12): "Booked"
// 11 / 600 --faint, "14/20" 20 / 800 (margin-top 2), "70% full" 11 --faint,
// and "Price" / "$12" / "Repeats every Friday"; the caps "Bookings · 14"
// (margin-top 18); the roster card (margin-top 8, radius 24, --card, 1px
// --border): rows padding 10 16 gap 12 (0.5px --div from row 2), the 32
// --tealbg / --tealink avatar 11.5 / 800, the name 13.5 / 700, the payment
// method 11.5 --faint; "See all {n}" 12 / 800 --pdark (padding 10 16); then
// "Cancel class" (margin-top 14, 52, radius 16, --highbg / --high 15 / 800).
//
// LIVE DATA: the roster is venue_class_roster (front desk; the instructor
// teaching the class sees masked labels): a first name each (the board's
// "Maya K." initial isn't in the data), the live payment method (cash at the
// venue; never a store or Whish), the paid / awaiting / refunded tag, the
// Under 18 tag, Mark as paid on a row awaiting payment (CL-08). KEPT (PLAN
// §3.4): Edit / Message / Substitute / Stop repeating / Delete in the
// header's ⋮ menu, the waitlist count and capacity line, the instructor card
// ("Covering for" / "Also teaching"), notes, the cancelled record, the share
// button (B-SH.1).

const SHOWN = 6;

export default function SessionPage() {
  const { id = "" } = useParams();
  const m = useMarketColours();
  const api = useSchedule();
  const navigate = useNavigate();
  const now = new Date();
  const today = todayIso(now);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState<{ id: string; entries: RosterEntry[] } | null>(null);
  const [rosterError, setRosterError] = useState(false);
  const [tick, setTick] = useState(0);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  // venue_class_roster needs front_desk. The instructor teaching THIS class
  // may see who booked it too (masked); its refusal (ATX03) reads as the same
  // explanation, never a retry that cannot work.
  const { authUserId } = useApp();
  const access = useConsoleAccess();
  const [refused, setRefused] = useState<string | null>(null);
  const teachesIt = !!authUserId && api.sessions.find((x) => x.id === id)?.professionalId === authUserId;
  const rosterAllowed = ((access.ready && (access.meets("front_desk") || teachesIt)) || access.failed) && refused !== id;
  const rosterHidden = access.ready && !rosterAllowed;
  const actions = useSessionActions(api, {
    onDeleted: () => navigate("/app/business/classes", { replace: true }),
  });
  const pay = useMarkBookingPaid({
    onDone: () => {
      setTick((t) => t + 1);
      actions.show("Marked as paid.");
    },
  });

  const row = api.classes.find((x) => x.id === id) ?? null;
  const session = api.sessions.find((x) => x.id === id) ?? null;

  useEffect(() => {
    if (!id || !rosterAllowed) return;
    let alive = true;
    void fetchClassRoster(id).then((r) => {
      if (!alive) return;
      if (!r.ok) {
        if (r.code === "ATX03") setRefused(id);
        else setRosterError(true);
        return;
      }
      setRosterError(false);
      setRoster({ id, entries: r.value });
    });
    return () => {
      alive = false;
    };
  }, [id, tick, session?.booked, rosterAllowed]);

  const eyebrow = api.kind === "classes" ? "Schedule" : "Classes";
  const people = api.people;
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/classes"));

  if (!row || !session) {
    return (
      <div style={{ paddingBottom: 32 }}>
        <style>{FOCUS_CSS}</style>
        <BackHeader m={m} eyebrow={eyebrow} title={api.loading ? "" : "Class"} onBack={goBack} />
        {api.loading ? (
          <MarketSkeleton radius={20} rows={3} count={2} label="Loading this class" />
        ) : api.error ? (
          <MarketError thing="this class" onRetry={api.reload} />
        ) : (
          <div style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: 16, fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2 }}>This class isn't on your schedule any more.</div>
        )}
      </div>
    );
  }

  const ended = isEnded(session, now);
  const offline = !api.online;
  const cancelled = !!session.cancelled;
  const entries = roster && roster.id === id ? roster.entries : null;
  const { booked: bookedList, waitlist } = splitRoster(entries ?? []);
  const left = Math.max(0, session.maxCapacity - session.booked);
  const pct = session.maxCapacity ? Math.round((session.booked / session.maxCapacity) * 100) : 0;
  const series = api.seriesOf(session.seriesId);
  const instructorName = session.professionalId ? api.nameOf(session.professionalId) : "";
  // OP1-093 row 3: after a substitute is assigned (this visit).
  const coverFor = session.professionalId ? api.coveringFor(session.id) : null;
  // The instructor's next other session (OP1-083 row 10 OURS rule).
  const next = session.professionalId
    ? api.sessions
        .filter((s) => s.id !== session.id && !s.cancelled && s.professionalId === session.professionalId && (s.date > today || (s.date === today && !isEnded(s, now))))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]
    : undefined;
  const capacityLine = cancelled
    ? null
    : ended
      ? "This class has ended."
      : left === 0
        ? `Full. ${entries ? `${waitlist.length} on the waitlist.` : ""}`
        : entries && waitlist.length > 0
          ? `${left} ${left === 1 ? "spot" : "spots"} left. ${waitlist.length} on the waitlist: if someone cancels, the first person gets their spot.`
          : `${left} ${left === 1 ? "spot" : "spots"} left.`;

  // OP1-088 (B7 MB-02): needs messages and front_desk, and someone booked.
  const msgReady = actions.canMessage && session.booked > 0;
  const menuOptions: PopupMenuOption<string>[] = cancelled
    ? []
    : ended
      ? msgReady
        ? [{ value: "msg", label: people === "clients" ? "Message clients" : "Message members", disabled: offline }]
        : []
      : [
          { value: "edit", label: "Edit class", disabled: offline },
          ...(msgReady ? [{ value: "msg", label: people === "clients" ? "Message clients" : "Message members", disabled: offline }] : []),
          { value: "sub", label: "Request a substitute", disabled: offline },
          ...(series ? [{ value: "end", label: "Stop repeating", disabled: offline }] : []),
          ...(session.booked === 0 ? [{ value: "delete", label: "Delete class", destructive: true, disabled: offline }] : []),
        ];

  const payTag = (e: RosterEntry) => {
    if (e.paymentStatus === "paid") return <Chip label="Paid" bg={m.goodbg} ink={m.good} />;
    if (e.paymentStatus === "pending") return <Chip label="Awaiting payment" bg={m.cautionbg} ink={m.caution} />;
    if (e.paymentStatus === "refunded") return <Chip label="Refunded" bg={m.soft} ink={m.faint} />;
    return null;
  };

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader
        m={m}
        eyebrow={eyebrow}
        title={session.title}
        onBack={goBack}
        right={
          <>
            {/* Market + Share 3.0 B-SH.1: share this class (Class spotlight card); not a cancelled or ended one. */}
            {!cancelled && !ended && (
              <BizShareButton
                label={`Share ${session.title}`}
                emptyHint={row.listedOnExplore === false ? "This class isn't on Explore, so it can't be shared." : null}
                getData={async () => ({
                  t: "class",
                  d: classData(session, {
                    about: row.about ?? null,
                    repeat: series ? repeatLine(series, series.startTime) : null,
                    createdAt: await fetchClassCreatedAt(session.id, session.seriesId ?? null),
                    now,
                  }),
                })}
              />
            )}
            {menuOptions.length > 0 && (
              <button
                ref={menuRef}
                type="button"
                aria-label={`Actions for ${session.title}`}
                aria-haspopup="menu"
                onClick={() => setMenuEl(menuRef.current)}
                className="market-focus flex items-center justify-center"
                style={{ width: 44, height: 44, color: m.ink2, background: "transparent", border: 0, borderRadius: 12 }}
              >
                <EllipsisVertical size={20} aria-hidden />
              </button>
            )}
          </>
        }
      />
      {offline && api.loadedAt !== null && <MarketOffline loaded style={{ marginBottom: 12 }} />}

      <p style={{ margin: 0, fontSize: textPx(13), color: m.ink2 }}>
        {whenText(session.date, session.startTime)} · {durationText(session.startTime, session.endTime)} · {instructorName || "No instructor named"}
      </p>
      {cancelled && (
        <p className="flex items-center flex-wrap" style={{ margin: "6px 0 0", gap: 6, fontSize: textPx(12), lineHeight: linePx(16), color: m.high, fontWeight: 600 }}>
          <Chip label="Cancelled" bg={m.highbg} ink={m.high} />
          {row.cancelReason ? row.cancelReason : `Booked ${people} were told.`}
        </p>
      )}

      <div className="grid" style={{ marginTop: 12, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
        <StatTile m={m} label="Booked" value={`${session.booked}/${session.maxCapacity}`} sub={`${pct}% full`} />
        <StatTile m={m} label="Price" value={priceText(row.price)} sub={repeatsLine(series)} />
      </div>
      <Caps m={m} style={{ marginTop: 18 }}>{`Bookings · ${session.booked}`}</Caps>
      <div style={{ marginTop: 8, borderRadius: 24, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
        {rosterHidden ? (
          <p style={{ margin: 0, padding: "14px 16px", fontSize: textPx(13), lineHeight: linePx(18), color: m.faint }}>Who booked is shown to staff with front desk access.</p>
        ) : rosterError && !entries ? (
          <div style={{ padding: 12 }}>
            <MarketError thing="who's booked" onRetry={() => setTick((t) => t + 1)} notchBg={m.card} />
          </div>
        ) : !entries ? (
          <div aria-busy="true" aria-label="Loading who's booked">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center" style={{ gap: 12, padding: "10px 16px", borderTop: i ? `0.5px solid ${m.div}` : 0 }}>
                <span aria-hidden className="animate-skeleton-pulse" style={{ width: 32, height: 32, borderRadius: 999, background: m.soft }} />
                <span aria-hidden className="animate-skeleton-pulse" style={{ height: 12, width: "40%", borderRadius: 999, background: m.soft }} />
              </div>
            ))}
          </div>
        ) : bookedList.length === 0 ? (
          <p style={{ margin: 0, padding: "14px 16px", fontSize: textPx(13), color: m.faint }}>Nobody has booked yet.</p>
        ) : (
          <>
            {bookedList.slice(0, SHOWN).map((e, i) => {
              // CL-08 (K2): a row awaiting payment opens "Mark as paid" for front desk.
              const markable = pay.can(e);
              const method = payMethodText(e.paymentMethod, e.priceAgreed);
              const inner = (
                <>
                  {!isMaskedLabel(e.label) ? (
                    <span aria-hidden className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: m.tealbg, color: m.tealink, fontSize: textPx(11.5), fontWeight: 800 }}>
                      {initialOf(e.label)}
                    </span>
                  ) : (
                    <span aria-hidden className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: m.soft, color: m.faint }}>
                      <UserRound size={15} />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 flex items-center flex-wrap" style={{ gap: 6 }}>
                    <span style={{ fontSize: textPx(13.5), fontWeight: 700, color: m.ink }}>{e.label}</span>
                    {e.isMinor && <Chip label="Under 18" bg={m.soft} ink={m.faint} />}
                    {payTag(e)}
                  </span>
                  {method && <span className="shrink-0" style={{ fontSize: textPx(11.5), color: m.faint }}>{method}</span>}
                </>
              );
              const style: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", minHeight: 52, width: "100%", textAlign: "start", borderTop: i ? `0.5px solid ${m.div}` : 0, background: "transparent" };
              return markable ? (
                <button
                  key={`${e.label}-${e.at}-${i}`}
                  type="button"
                  onClick={(ev) => pay.open(e, ev.currentTarget)}
                  disabled={pay.busy}
                  aria-label={`${e.label}, awaiting payment${method ? `, ${method}` : ""}. Actions`}
                  className="market-focus"
                  style={{ ...style, border: 0, borderTop: style.borderTop }}
                >
                  {inner}
                </button>
              ) : (
                <div key={`${e.label}-${e.at}-${i}`} style={style}>
                  {inner}
                </div>
              );
            })}
            {pay.error && (
              <p role="alert" style={{ margin: 0, padding: "10px 16px", borderTop: `0.5px solid ${m.div}`, fontSize: textPx(11.5), fontWeight: 700, lineHeight: linePx(16), color: m.high }}>
                {pay.error}
              </p>
            )}
            <button
              type="button"
              onClick={() => setRosterOpen(true)}
              className="market-focus hit w-full text-start"
              style={{ display: "block", padding: "10px 16px", minHeight: 38, borderTop: `0.5px solid ${m.div}`, fontSize: textPx(12), fontWeight: 800, color: m.pdark, background: "transparent", borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0 }}
            >
              See all {bookedList.length}
            </button>
          </>
        )}
      </div>

      {!cancelled && !ended && (
        <button
          type="button"
          onClick={() => actions.openCancel(id)}
          disabled={offline}
          className="market-focus w-full flex items-center justify-center disabled:opacity-40"
          style={{ marginTop: 14, height: 52, borderRadius: 16, background: m.highbg, color: m.high, fontSize: textPx(15), fontWeight: 800, border: 0 }}
        >
          Cancel class
        </button>
      )}

      <Caps m={m} style={{ marginTop: 22, marginBottom: 8 }}>
        Class details
      </Caps>
      <div style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => (session.professionalId ? navigate(`/app/business/employees/${session.professionalId}`) : !cancelled && !ended && actions.openSubstitute(id))}
          className="market-focus w-full flex items-center text-start"
          style={{ gap: 12, padding: "12px 16px", minHeight: 56, background: "transparent", border: 0 }}
        >
          {session.professionalId ? (
            <span aria-hidden className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: m.tealbg, color: m.tealink, fontSize: textPx(11.5), fontWeight: 800 }}>
              {initialOf(instructorName)}
            </span>
          ) : (
            <span aria-hidden className="shrink-0" style={{ width: 32, height: 32, borderRadius: 999, border: `1.5px dashed ${m.fill}`, background: m.soft }} />
          )}
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(11), fontWeight: 600, color: m.faint }}>Instructor</span>
            <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, color: session.professionalId ? m.ink : m.ink2 }}>{session.professionalId ? instructorName : "No instructor named"}</span>
            <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(15), color: m.faint }}>
              {session.professionalId
                ? coverFor
                  ? `Covering for ${api.nameOf(coverFor)} ${dayWords(session.date, today)}`
                  : next
                    ? `Also teaching ${next.title} ${next.date === today ? "today" : next.date === addDays(today, 1) ? "tomorrow" : `on ${shortDate(next.date)}`}`
                    : "No other classes coming up"
                : cancelled || ended
                  ? "Nobody was named"
                  : "Tap to choose who teaches it"}
            </span>
          </span>
          <ChevronRight size={16} style={{ color: m.faint }} aria-hidden />
        </button>
        {capacityLine && (
          <div style={{ padding: "12px 16px", borderTop: `0.5px solid ${m.div}` }}>
            <p style={{ margin: 0, fontSize: textPx(11), fontWeight: 600, color: m.faint }}>Spots</p>
            <p className="flex items-baseline flex-wrap" style={{ margin: "2px 0 0", columnGap: 8, fontSize: textPx(13), lineHeight: linePx(18), color: m.ink2 }}>
              <span>{capacityLine}</span>
              {entries && waitlist.length > 0 && rosterAllowed && (
                <button type="button" onClick={() => setRosterOpen(true)} className="market-focus hit" style={{ fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, background: "transparent", border: 0, padding: 0 }}>
                  See waitlist
                </button>
              )}
            </p>
          </div>
        )}
        {row.notes && (
          <div style={{ padding: "12px 16px", borderTop: `0.5px solid ${m.div}` }}>
            <p style={{ margin: 0, fontSize: textPx(11), fontWeight: 600, color: m.faint }}>Notes for the instructor</p>
            <p style={{ margin: "2px 0 0", fontSize: textPx(13), lineHeight: linePx(18), color: m.ink2, whiteSpace: "pre-wrap" }}>{row.notes}</p>
          </div>
        )}
        {series && (
          <div style={{ padding: "12px 16px", borderTop: `0.5px solid ${m.div}` }}>
            <p style={{ margin: 0, fontSize: textPx(11), fontWeight: 600, color: m.faint }}>Repeats</p>
            <p style={{ margin: "2px 0 0", fontSize: textPx(13), lineHeight: linePx(18), color: m.ink2 }}>{repeatLine(series, series.startTime)}</p>
          </div>
        )}
      </div>

      <PopupMenu
        open={!!menuEl}
        onClose={() => setMenuEl(null)}
        anchor={menuEl}
        options={menuOptions}
        width={210}
        onSelect={(v) => {
          setMenuEl(null);
          if (v === "edit") actions.openEdit(id);
          if (v === "msg") actions.openMessage(id);
          if (v === "sub") actions.openSubstitute(id);
          if (v === "end") actions.openEndSeries(id);
          if (v === "delete") actions.openDelete(id);
        }}
      />
      <ClassRosterSheet
        classId={rosterOpen && rosterAllowed ? id : null}
        title={session.title}
        session={{ date: session.date, startTime: session.startTime, endTime: session.endTime, maxCapacity: session.maxCapacity }}
        onClose={() => setRosterOpen(false)}
        onMarkedPaid={() => {
          setTick((t) => t + 1);
          actions.show("Marked as paid.");
        }}
      />
      {pay.element}
      {actions.elements}
    </div>
  );
}

/** classBookings tiles (line 434–435): --soft radius 18 padding 12 14; label 11 / 600 --faint, value 20 / 800 (margin-top 2), foot 11 --faint. */
function StatTile({ m, label, value, sub }: { m: MarketPalette; label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0" style={{ borderRadius: 18, background: m.soft, padding: "12px 14px" }}>
      <div style={{ fontSize: textPx(11), fontWeight: 600, color: m.faint }}>{label}</div>
      <div className="tabular-nums" style={{ fontSize: textPx(20), fontWeight: 800, marginTop: 2, color: m.ink }}>{value}</div>
      <div style={{ fontSize: textPx(11), color: m.faint }}>{sub}</div>
    </div>
  );
}

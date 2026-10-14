import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, Bike, CalendarDays, Dumbbell, MessageCircle, Pencil, PersonStanding, Repeat2, Trash2, User, UserRound, Users } from "lucide-react";
import { ClassRosterSheet } from "../../../components/marketplace/ClassRosterSheet";
import { fetchClassRoster } from "../../../services/venues/console";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useApp } from "../../../context/AppContext";
import { isMaskedLabel, methodLabel, money, splitRoster, type RosterEntry } from "../../../services/venues/consoleLogic";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { useOps } from "./opsTheme";
import { BackRow, Bone, ErrorCard, FiguresCard, OpsCard, Tag } from "./parts";
import { useSessionActions } from "./SessionActions";
import { useSchedule } from "./useSchedule";
import { addDays, dayHeading, dayWords, initialOf, isEnded, shortDate, todayIso } from "./scheduleModel";

// The session page (OP1-083; OpsTabsV4 view=session). Route
// /app/business/classes/:id. Tiles: Edit, Message (B7: shown, not available
// yet), Substitute, and Delete only while nobody has booked (V6-55; Cancel
// session arrives with cancel_class_session, B9). The live roster
// (venue_class_roster) is the Booked members card; "See all" opens the
// roster sheet (lead: ClassRosterSheet as Booked members / See all).

/** OP1-083 row 3 OURS map (Lucide): class type → header glyph. */
function typeIcon(type: string): React.ReactNode {
  const t = type.toLowerCase();
  const p = { size: 26, strokeWidth: 1.8 };
  if (t.includes("spin") || t.includes("cycl")) return <Bike {...p} />;
  if (t.includes("yoga") || t.includes("mobil") || t.includes("pilates") || t.includes("stretch")) return <PersonStanding {...p} />;
  if (t.includes("hiit") || t.includes("strength") || t.includes("conditioning") || t.includes("cardio")) return <Dumbbell {...p} />;
  if (t.includes("group")) return <Users {...p} />;
  if (t.includes("personal")) return <User {...p} />;
  if (t.includes("physio")) return <Activity {...p} />;
  return <CalendarDays {...p} />;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function bookedOn(at: string, today: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return iso === today ? "today" : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function SessionPage() {
  const { id = "" } = useParams();
  const c = useOps();
  const api = useSchedule();
  const navigate = useNavigate();
  const now = new Date();
  const today = todayIso(now);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roster, setRoster] = useState<{ id: string; entries: RosterEntry[] } | null>(null);
  const [rosterError, setRosterError] = useState(false);
  const [tick, setTick] = useState(0);
  // venue_class_roster needs front_desk (Database b95ef5c). The instructor
  // teaching THIS class may see who booked it too (user, 14 Oct: masked as
  // "Member #code" unless shared), once the Database allows it; until then
  // its refusal (ATX03) reads as the same explanation, never a retry that
  // cannot work.
  const { authUserId } = useApp();
  const access = useConsoleAccess();
  const [refused, setRefused] = useState<string | null>(null);
  const teachesIt = !!authUserId && api.sessions.find((x) => x.id === id)?.professionalId === authUserId;
  const rosterAllowed = ((access.ready && (access.meets("front_desk") || teachesIt)) || access.failed) && refused !== id;
  const rosterHidden = access.ready && !rosterAllowed;
  const actions = useSessionActions(api, {
    onDeleted: () => navigate("/app/business/classes", { replace: true }),
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

  const backLabel = api.kind === "classes" ? "Schedule" : "Classes";
  const people = api.people;

  if (!row || !session) {
    return (
      <div style={{ marginTop: -2 }}>
        <BackRow c={c} label={backLabel} to="/app/business/classes" />
        {api.loading ? (
          <div aria-busy="true" className="flex items-center" style={{ gap: 14 }}>
            <Bone c={c} w={60} h={60} r={16} />
            <div className="flex-1">
              <Bone c={c} w="60%" h={20} />
              <Bone c={c} w="80%" h={12} style={{ marginTop: 8 }} />
            </div>
          </div>
        ) : api.error ? (
          <ErrorCard c={c} message="Couldn't load this class. Check your connection and try again." onRetry={api.reload} />
        ) : (
          <OpsCard c={c} radius={20}>
            <p style={{ margin: 0, padding: 16, fontSize: textPx(12.5), lineHeight: linePx(18), color: c.inkSoft }}>This class isn't on your schedule any more.</p>
          </OpsCard>
        )}
      </div>
    );
  }

  const ended = isEnded(session, now);
  const offline = !api.online;
  const entries = roster && roster.id === id ? roster.entries : null;
  const { booked: bookedList, waitlist } = splitRoster(entries ?? []);
  const left = Math.max(0, session.maxCapacity - session.booked);
  const pct = session.maxCapacity ? Math.round((session.booked / session.maxCapacity) * 100) : 0;
  const line = ended
    ? "This class has ended."
    : left === 0
      ? `Full. ${waitlist.length} on the waitlist.`
      : waitlist.length > 0
        ? `${left} ${left === 1 ? "spot" : "spots"} left. If someone cancels, the first person on the waitlist gets their spot.`
        : `${left} ${left === 1 ? "spot" : "spots"} left.`;

  // The instructor's next other session (OP1-083 row 10 OURS rule).
  const next = session.professionalId
    ? api.sessions
        .filter((s) => s.id !== session.id && s.professionalId === session.professionalId && (s.date > today || (s.date === today && !isEnded(s, now))))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]
    : undefined;
  const instructorName = session.professionalId ? api.nameOf(session.professionalId) : "";
  // OP1-093 row 3: after a substitute is assigned (this visit; the stored exception is B9).
  const coverFor = session.professionalId ? api.coveringFor(session.id) : null;

  type Tile = { key: string; label: string; icon: React.ReactNode; tone?: "high"; disabled?: boolean; aria?: string; onClick?: () => void };
  // OP1-088 (B7 MB-02): needs messages and front_desk, and someone booked.
  const msgReady = actions.canMessage && session.booked > 0;
  const msgTile: Tile = {
    key: "msg",
    label: "Message",
    icon: <MessageCircle size={17} strokeWidth={2.1} />,
    disabled: !msgReady || offline,
    aria: !actions.canMessage ? `Message ${people}, needs messages access` : session.booked === 0 ? `Message ${people}, nobody has booked yet` : `Message the ${session.booked} booked ${people}`,
    onClick: msgReady ? () => actions.openMessage(id) : undefined,
  };
  const tiles: Tile[] = ended
    ? [msgTile]
    : [
        { key: "edit", label: "Edit", icon: <Pencil size={17} strokeWidth={2.1} />, onClick: () => actions.openEdit(id), disabled: offline },
        msgTile,
        { key: "sub", label: "Substitute", icon: <Repeat2 size={17} strokeWidth={2.1} />, onClick: () => actions.openSubstitute(id), disabled: offline },
        ...(session.booked === 0
          ? [{ key: "delete", label: "Delete", icon: <Trash2 size={17} strokeWidth={2.1} />, tone: "high" as const, onClick: () => actions.openDelete(id), disabled: offline }]
          : []),
      ];

  const payTag = (e: RosterEntry) => {
    if (e.paymentStatus === "paid") return <Tag size="head" label="Paid" bg={c.dark ? "#192A20" : "#E3F3E9"} ink={c.good} />;
    if (e.paymentStatus === "pending") return <Tag size="head" label="Awaiting payment" bg={c.dark ? "#332B1A" : "#F6E9C9"} ink={c.caution} />;
    if (e.paymentStatus === "refunded") return <Tag size="head" label="Refunded" bg={c.soft} ink={c.faint} />;
    return null;
  };

  return (
    <div style={{ marginTop: -2 }}>
      <BackRow c={c} label={backLabel} onBack={() => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/classes"))} />

      <div className="flex items-center" style={{ gap: 14 }}>
        <span className="shrink-0 flex items-center justify-center" style={{ width: 60, height: 60, borderRadius: 16, background: c.pale, color: c.pDark }}>
          {typeIcon(session.classType || session.title)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex items-center flex-wrap" style={{ margin: 0, gap: 7 }}>
            <span style={{ fontSize: textPx(22), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: linePx(27), color: c.ink }}>{session.title}</span>
            <Tag size="head" label="Class" bg={c.pale} ink={c.pDark} />
            {session.classType && <Tag size="head" label={session.classType} bg={c.pale} ink={c.pDark} />}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: textPx(13), lineHeight: linePx(18), color: c.inkSoft }}>
            {dayHeading(session.date, today)} · {time12(session.startTime)} to {time12(session.endTime)}
          </p>
          <p style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(16), color: c.faint }}>{row.price ? `${row.price} · Cash` : "Free"}</p>
          {offline && api.loadedAt && (
            <p style={{ margin: 0, fontSize: textPx(11.5), color: c.faint }}>
              Offline. Showing {time12(`${new Date(api.loadedAt).getHours()}:${new Date(api.loadedAt).getMinutes()}`)}.
            </p>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 6, marginTop: 16 }}>
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={t.onClick}
            disabled={t.disabled}
            aria-label={t.aria}
            title={t.aria}
            className="tap flex flex-col items-center justify-center"
            style={{
              minHeight: 60,
              borderRadius: 16,
              background: c.soft,
              color: t.tone === "high" ? c.high : c.ink,
              gap: 4,
              fontSize: textPx(11),
              fontWeight: 800,
              whiteSpace: "nowrap",
              opacity: t.disabled ? 0.45 : 1,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <FiguresCard
        c={c}
        marginTop={14}
        boxes={[
          { label: "Booked", value: `${session.booked}/${session.maxCapacity}`, delta: `${pct}%`, deltaInk: c.faint },
          { label: "Waitlist", value: entries ? String(waitlist.length) : "–", dash: !entries, onClick: waitlist.length && rosterAllowed ? () => setRosterOpen(true) : undefined },
        ]}
        line={line}
      />

      {/* Instructor (row 10) */}
      <OpsCard c={c} style={{ marginTop: 14 }}>
        <div className="flex items-baseline justify-between" style={{ gap: 10, padding: "14px 16px 6px" }}>
          <p style={{ margin: 0, fontSize: textPx(14), fontWeight: 800, color: c.ink }}>Instructor</p>
        </div>
        <button
          type="button"
          onClick={() => (session.professionalId ? navigate(`/app/business/employees/${session.professionalId}`) : actions.openSubstitute(id))}
          className="tap w-full flex items-center text-left"
          style={{ gap: 10, padding: "10px 16px", minHeight: 54 }}
        >
          {session.professionalId ? (
            <span className="shrink-0 flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 999, background: c.tealPale, color: c.tealInk, fontSize: textPx(12), fontWeight: 800 }}>
              {initialOf(instructorName)}
            </span>
          ) : (
            <span aria-hidden className="shrink-0" style={{ width: 34, height: 34, borderRadius: 999, border: `1.5px dashed ${c.primary}` }} />
          )}
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), color: session.professionalId ? c.ink : c.high }}>
              {session.professionalId ? instructorName : "No instructor yet"}
            </span>
            <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(15), color: c.faint }}>
              {session.professionalId
                ? coverFor
                  ? `Covering for ${api.nameOf(coverFor)} ${dayWords(session.date, today)}`
                  : next
                  ? `Also teaching ${next.title} ${next.date === today ? "today" : next.date === addDays(today, 1) ? "tomorrow" : `on ${shortDate(next.date)}`}`
                  : "No other classes coming up"
                : "Tap to choose who teaches it"}
            </span>
          </span>
        </button>
      </OpsCard>

      {row.notes && (
        <OpsCard c={c} style={{ marginTop: 14 }}>
          <p style={{ margin: 0, padding: "14px 16px 6px", fontSize: textPx(14), fontWeight: 800, color: c.ink }}>Notes</p>
          <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: textPx(13), lineHeight: linePx(18), color: c.inkSoft, whiteSpace: "pre-wrap" }}>{row.notes}</p>
        </OpsCard>
      )}

      {/* Booked members (row 11, K1) */}
      <OpsCard c={c} style={{ marginTop: 14 }}>
        <div className="flex items-baseline justify-between" style={{ gap: 10, padding: "14px 16px 6px" }}>
          <p style={{ margin: 0, fontSize: textPx(14), fontWeight: 800, color: c.ink }}>{people === "clients" ? "Booked clients" : "Booked members"}</p>
          <p className="whitespace-nowrap" style={{ margin: 0, fontSize: textPx(11.5), color: c.faint }}>
            {session.booked}
          </p>
        </div>
        {rosterHidden ? (
          <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: textPx(13), lineHeight: linePx(18), color: c.faint }}>Who booked is shown to staff with front desk access.</p>
        ) : rosterError && !entries ? (
          <ErrorCard c={c} inner message="Couldn't load who's booked. Check your connection and try again." onRetry={() => setTick((t) => t + 1)} disabled={offline} />
        ) : !entries ? (
          [0, 1].map((i) => (
            <div key={i} className="flex items-center" style={{ gap: 10, padding: "10px 16px", borderTop: i ? `1px solid ${c.divider}` : "none" }}>
              <Bone c={c} w={34} h={34} r={999} />
              <div className="flex-1">
                <Bone c={c} w="50%" h={11} />
                <Bone c={c} w="70%" h={9} style={{ marginTop: 6 }} />
              </div>
            </div>
          ))
        ) : bookedList.length === 0 ? (
          <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: textPx(13), color: c.faint }}>Nobody has booked yet.</p>
        ) : (
          <>
            {bookedList.slice(0, 3).map((e, i) => (
              <div key={`${e.label}-${e.at}-${i}`} className="flex items-center" style={{ gap: 10, padding: "10px 16px", minHeight: 55, borderTop: i ? `1px solid ${c.divider}` : "none" }}>
                {!isMaskedLabel(e.label) ? (
                  <span className="shrink-0 flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 999, background: c.tealPale, color: c.tealInk, fontSize: textPx(12), fontWeight: 800 }}>
                    {initialOf(e.label)}
                  </span>
                ) : (
                  <span className="shrink-0 flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 999, background: c.soft, color: c.faint, border: c.hc ? `1px solid ${c.border}` : undefined }}>
                    <UserRound size={15} />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="flex items-center flex-wrap" style={{ margin: 0, gap: 6, fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), color: c.ink }}>
                    {e.label}
                    {e.isMinor && <Tag size="head" label="Under 18" bg={c.soft} ink={c.faint} />}
                  </p>
                  <p style={{ margin: 0, fontSize: textPx(11.5), lineHeight: linePx(15), color: c.faint }}>
                    {[`Booked ${bookedOn(e.at, today)}`, e.priceAgreed !== null ? (e.priceAgreed > 0 ? money(e.priceAgreed) : "Free") : null, methodLabel(e.paymentMethod)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {payTag(e)}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRosterOpen(true)}
              className="tap w-full text-center"
              style={{ padding: "12px 16px", minHeight: 44, borderTop: `1px solid ${c.divider}`, fontSize: textPx(12.5), fontWeight: 800, color: c.pDark }}
            >
              See all {bookedList.length}
            </button>
          </>
        )}
      </OpsCard>

      <ClassRosterSheet classId={rosterOpen && rosterAllowed ? id : null} title={session.title} onClose={() => setRosterOpen(false)} />
      {actions.elements}
    </div>
  );
}


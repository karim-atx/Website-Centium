import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Check, ChevronRight, Copy, Inbox, MessageCircle, Plus, Share2, UserPlus } from "lucide-react";
import { copyText, shareOrCopy } from "../../components/business-more/share";
import { useOpenThread } from "../../components/messages/useOpenThread";
import { fetchBooked, type ClassSession, type TeamPerson } from "../../services/business-team/team";
import { Avatar, Notice, TeamCta, TeamScope, isOfflineNow, useTeamToast } from "./parts";
import { InviteSheet, SeatsFullSheet } from "./TeamSheets";
import { SeatPurchaseSheet } from "../business-analytics/team/SeatPurchaseSheet";
import {
  teamTitle,
  firstWord,
  isAccepted,
  previewLine,
  roleShort,
  roleAndProfession,
  seatBlocks,
  seatCounts,
  noSeatPeople,
  seatHint,
  seatLine,
  teamBoxes,
  teamSubtitle,
} from "./teamLogic";
import type { TeamData } from "./useTeamData";

// OP1-053 / 112 (team tab), 055 / 118 (early), 056 / 119 (empty), 058 / 120
// (store), 114 (seat preview), 116 / 117 (two blocks, free seat), 065-070
// (invite flow, all seats in use). Reached from More › Team and access and
// titled per type (O1); the Operations title and segmented tabs are not built.
//
// LIVE: the team with B0 consent (accepted = seat, invited = no seat), seat
// capacity (B6 my_business_seat_capacity), join requests (B6), invite
// (invite_employee), the business code (B5) with Copy and Share, remove
// (person page, with a confirm), the load error, and the seat cap.
// Add seats opens the AN5 057-060 flow (OP1-053 S4), which places a B8 RV-06
// seat order to Centium (owner only; seats count once Centium records the
// payment).
// PENDING: cover requests (BU2-16 has no table: the card shows only with
// data, so it never shows today).

const PER_BLOCK = 5;

export function TeamPage({ data }: { data: TeamData }) {
  const navigate = useNavigate();
  const { kind, people, capacity, requests, sessions, error, today, businessId, code, businessName, readOnly } = data;
  const [toast, showToast] = useTeamToast(150);
  const [selected, setSelected] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [offline, setOffline] = useState(isOfflineNow());

  useEffect(() => {
    const on = () => setOffline(isOfflineNow());
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const total = capacity?.capacity ?? 0;
  const per = capacity?.seatsPerUnit ?? PER_BLOCK;
  const server = capacity ? { used: capacity.used, invited: capacity.invited } : null;
  const counts = seatCounts(people ?? [], total, server);
  const noSeat = useMemo(() => noSeatPeople(people ?? []), [people]);
  const blocks = useMemo(() => seatBlocks(people ?? [], total, per), [people, total, per]);
  const boxes = useMemo(() => teamBoxes(kind, people ?? [], sessions, total, today, Date.now(), server), [kind, people, sessions, total, today, capacity]);
  const waiting = requests?.length ?? 0;
  const selPerson = (people ?? []).find((p) => p.professionalId === selected && isAccepted(p)) ?? null;
  const ready = !!people && !!capacity;

  const invite = () => {
    if (counts.free > 0) return setInviteOpen(true);
    setFullOpen(true);
  };

  const copy = async () => {
    if (!code) return;
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
    showToast(ok ? "Business ID copied." : "Couldn't copy. Try again.", !ok);
  };
  const share = async () => {
    if (!code) return;
    const text = `Join ${businessName || "our team"} on Centium. Enter business ID ${code} when you ask to join.`;
    const r = await shareOrCopy({ title: "Our business ID on Centium", text, copy: text });
    if (r === "copied") showToast("Business ID copied.");
    if (r === "failed") showToast("Couldn't share right now. Try again.", true);
  };

  return (
    <TeamScope>
      <h1 className="tm-title">{teamTitle(kind, data.kindKnown)}</h1>
      {/* Held blank (same height) until the lane is known. */}
      <p className="tm-subtitle">{data.kindKnown ? teamSubtitle(kind) : " "}</p>

      {offline ? (
        <Notice message="You're offline. Showing your last saved team." />
      ) : (
        error && <Notice message={error} onRetry={data.reload} />
      )}

      <div className="tm-top">
        <div className="tm-id">
          <p className="tm-id-l">Your business ID</p>
          <p className="tm-id-v">{code ?? "–"}</p>
          <div className="tm-id-btns">
            <button type="button" className="tm-iconbtn tap" aria-label="Copy business ID" disabled={!code} onClick={() => void copy()}>
              {copied ? <Check size={17} strokeWidth={2} /> : <Copy size={17} strokeWidth={2} />}
            </button>
            <button type="button" className="tm-iconbtn tap" aria-label="Share business ID" disabled={!code || offline} onClick={() => void share()}>
              <Share2 size={17} strokeWidth={2} />
            </button>
          </div>
        </div>
        <button
          type="button"
          className={waiting ? "tm-jr has tap" : "tm-jr tap"}
          aria-label={`Join requests, ${waiting ? `${waiting} waiting` : "none waiting"}`}
          onClick={() => navigate("/app/business/employees/requests")}
        >
          <span className="tm-jr-tile">
            <Inbox size={18} strokeWidth={2} />
          </span>
          {waiting > 0 && <span className="tm-badge">{waiting}</span>}
          <span>
            <span className="tm-jr-t" style={{ display: "block" }}>
              Join requests
            </span>
            <span className="tm-jr-s" style={{ display: "block" }}>
              {requests === null ? "–" : waiting ? `${waiting} waiting for you` : "None waiting"}
            </span>
          </span>
        </button>
      </div>

      <div className="tm-card" aria-busy={!ready}>
        <div className="tm-boxes">
          {boxes.boxes.map((b) => (
            <div key={b.label} className="tm-box">
              <p className="tm-box-l">{b.label}</p>
              <p className="tm-box-v">
                <b className={ready ? undefined : "none"}>{ready ? b.value : "–"}</b>
                {ready && b.delta && <span>{b.delta}</span>}
              </p>
            </div>
          ))}
        </div>
        <p className="tm-boxline">{ready ? boxes.line : "Loading your team…"}</p>
      </div>

      <div className="tm-team">
        <div className="tm-team-h">
          <div>
            <p className="tm-team-t">Your team</p>
            <p className="tm-team-s">{ready ? seatLine(counts) : "–"}</p>
          </div>
          {!readOnly && (
          <button type="button" className="tm-outbtn tm-hit tap" disabled={offline} onClick={() => setBuying(true)}>
            <Plus size={14} strokeWidth={2.4} />
            Add seats
          </button>
          )}
        </div>

        {ready &&
          blocks.map((block, bi) => (
            <div key={bi}>
              <p className="tm-block-l">{`Block ${bi + 1} · ${block.length} seats`}</p>
              <ul className="tm-grid" aria-label={`Block ${bi + 1}`}>
                {block.map((seat) => (
                  <li key={seat.index} style={{ minWidth: 0 }}>
                    {seat.kind === "free" && readOnly ? (
                      // B8 RV-06: staff see the real capacity (business_plan_summary); a free seat isn't theirs to fill.
                      <span className="tm-seat" aria-label="Free seat">
                        <span className="tm-av free">
                          <Plus size={18} strokeWidth={2.2} />
                        </span>
                        <span className="tm-seat-n free">Free</span>
                      </span>
                    ) : seat.kind === "free" ? (
                      <button
                        type="button"
                        className="tm-seat tap"
                        aria-label="Free seat, invite an employee"
                        disabled={offline}
                        onClick={invite}
                      >
                        <span className="tm-av free">
                          <Plus size={18} strokeWidth={2.2} />
                        </span>
                        <span className="tm-seat-n free">Free</span>
                        <span className="tm-seat-s p">Invite</span>
                      </button>
                    ) : (
                      <SeatButton
                        person={seat.person}
                        selected={selected === seat.person.professionalId}
                        onClick={() => {
                          const p = seat.person;
                          if (!isAccepted(p)) return navigate(`/app/business/employees/${p.professionalId}`);
                          setSelected((s) => (s === p.professionalId ? null : p.professionalId));
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        {ready && noSeat.length > 0 && (
          <div>
            <p className="tm-block-l">No seat needed</p>
            <ul className="tm-grid" aria-label="Team members who don't use a seat">
              {noSeat.map((p) => (
                <li key={p.professionalId} style={{ minWidth: 0 }}>
                  <SeatButton
                    person={p}
                    selected={selected === p.professionalId}
                    onClick={() => {
                      if (!isAccepted(p)) return navigate(`/app/business/employees/${p.professionalId}`);
                      setSelected((x) => (x === p.professionalId ? null : p.professionalId));
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
        {!ready && !error && (
          <>
            <p className="tm-block-l">&nbsp;</p>
            <div className="tm-grid" aria-label="Loading your team">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="tm-seat" style={{ opacity: 0.5 }}>
                  <span className="tm-av" />
                </span>
              ))}
            </div>
          </>
        )}

        {selPerson ? (
          <SeatPreview
            person={selPerson}
            sessions={sessions}
            today={today}
            onProfile={() => navigate(`/app/business/employees/${selPerson.professionalId}`)}
          />
        ) : (
          ready && <p className="tm-hint">{readOnly ? "Tap a seat to see who's in it." : seatHint(counts, per)}</p>
        )}
      </div>

      {readOnly ? (
        <p className="tm-note" role="note" style={{ textAlign: "center", marginTop: 14 }}>
          {`You can see ${businessName || "the business"}'s team. Only the owner can add people, change what they can do or remove someone.`}
        </p>
      ) : (
        <TeamCta label="Add an employee" icon={<UserPlus size={17} strokeWidth={2.4} />} onClick={invite} disabled={!ready || offline} />
      )}

      {businessId && !readOnly && (
        <InviteSheet
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          businessId={businessId}
          kind={kind}
          counts={counts}
          onSent={() => {
            setInviteOpen(false);
            showToast("Invite sent. Their seat shows as invited until they accept.");
            data.reload();
          }}
          onNoSeats={() => {
            setInviteOpen(false);
            setFullOpen(true);
          }}
        />
      )}
      <SeatsFullSheet
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        counts={counts}
        onInviteNoSeat={() => {
          setFullOpen(false);
          setInviteOpen(true);
        }}
        onChanged={data.reload}
      />
      {buying && (
        <SeatPurchaseSheet
          used={counts.used}
          pending={counts.invited}
          fallback={{ capacity: total, planActive: total > 0, blocks: capacity?.seatBlocks ?? 0, perBlock: per, blockPrice: null }}
          onClose={() => setBuying(false)}
          onChanged={data.reload}
        />
      )}
      {toast}
    </TeamScope>
  );
}

function SeatButton({ person, selected, onClick }: { person: TeamPerson; selected: boolean; onClick: () => void }) {
  const inv = !isAccepted(person);
  return (
    <button
      type="button"
      className={selected ? "tm-seat sel tap" : "tm-seat tap"}
      aria-label={`${person.name}, ${inv ? "invited" : roleShort(person.role)}`}
      aria-pressed={inv ? undefined : selected}
      onClick={onClick}
    >
      <Avatar name={person.name} url={inv ? null : person.avatarUrl} className={inv ? "tm-av invited" : "tm-av"} />
      <span className="tm-seat-n">{firstWord(person.name)}</span>
      <span className={inv ? "tm-seat-s p" : "tm-seat-s"}>{inv ? "Invited" : roleShort(person.role)}</span>
    </button>
  );
}

/** OP1-114: the selected seat's preview card. */
function SeatPreview({ person, sessions, today, onProfile }: { person: TeamPerson; sessions: ClassSession[]; today: string; onProfile: () => void }) {
  const { open, busy } = useOpenThread(person.professionalId);
  const next = useMemo(
    () => sessions.filter((s) => s.professionalId === person.professionalId && s.date >= today).slice(0, 2),
    [sessions, person.professionalId, today]
  );
  const [booked, setBooked] = useState<Record<string, number | null>>({});
  useEffect(() => {
    let cancelled = false;
    void Promise.all(next.map(async (s) => [s.id, await fetchBooked(s.id, s.capacity)] as const)).then((pairs) => {
      if (!cancelled) setBooked(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <section className="tm-pv" aria-label={`${person.name}, seat preview`}>
      <Avatar name={person.name} url={person.avatarUrl} className="tm-av" />
      <div className="tm-pv-b">
        <p className="tm-pv-n">{person.name}</p>
        <p className="tm-pv-r">{roleAndProfession(person)}</p>
        {next.length === 0 && (
          <p className="tm-pv-next">
            <CalendarClock size={13} />
            No classes this week
          </p>
        )}
        {next.map((s) => (
          <p key={s.id} className="tm-pv-next">
            <CalendarClock size={13} />
            {previewLine(s, today, booked[s.id] ?? null)}
          </p>
        ))}
        <button type="button" className="tm-link tm-hit tap" onClick={onProfile}>
          View profile
          <ChevronRight size={14} />
        </button>
      </div>
      <button type="button" className="tm-iconbtn soft tap" aria-label={`Message ${person.name}`} disabled={busy} onClick={() => void open()}>
        <MessageCircle size={17} strokeWidth={2} />
      </button>
    </section>
  );
}

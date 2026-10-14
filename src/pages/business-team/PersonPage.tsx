import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Award, CalendarClock, CalendarDays, ChevronDown, FileBadge, MessageCircle, Repeat2, TriangleAlert, UserMinus, UserX } from "lucide-react";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { useOpenThread } from "../../components/messages/useOpenThread";
import { removeTeamMember } from "../../services/business-team";
import { fetchBooked, fetchCredentials, type Credential } from "../../services/business-team/team";
import { fetchReviewsFor } from "../../services/professional-reviews";
import { MIN_REVIEWS_FOR_AVERAGE } from "../../services/professional-reviews/rules";
import { range12 } from "../../utils/time12";
import { localDayOf } from "../../utils/date";
import { AvailabilityCard } from "./AvailabilityCard";
import { Avatar, BackRow, DCard, Notice, Row, TeamScope, isOfflineNow, useTeamToast } from "./parts";
import { ROLE_DOES, ROLE_LABEL, TEAM_TITLE, clashOf, dayDate, dayWord, firstWord, isAccepted, longDate, weekRange } from "./teamLogic";
import type { TeamData } from "./useTeamData";

// OP1-061 / 130 (person page), 063 / 132 (credentials), 064 (remove
// confirm), 134-139 (availability), 138 (invited person). Source order: back
// row, header, actions, Role, Credentials, Upcoming sessions, Availability,
// What they can do, Remove from team.
//
// PENDING: changing a role or permissions (B6 has no write path: the picker
// is shown disabled and the "What they can do" card stays hidden, V6-84);
// Cover (BU2-16); specialty, experience, bio and links (owner-only today,
// BU2-14: only the licence fields of employee_credentials are readable).

export function PersonPage({ data }: { data: TeamData }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { kind, people, sessions, today, businessId, error } = data;
  const person = people?.find((p) => p.professionalId === id) ?? null;
  const [toast, showToast] = useTeamToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [credError, setCredError] = useState(false);
  const [rating, setRating] = useState<string | null>(null);
  const [booked, setBooked] = useState<Record<string, number | null>>({});
  const { open: openChat, busy: chatBusy, error: chatError } = useOpenThread(id);
  const offline = isOfflineNow();
  const accepted = !!person && isAccepted(person);
  const back = () => navigate("/app/business/employees");

  useEffect(() => {
    if (!businessId || !accepted) return;
    let cancelled = false;
    void fetchCredentials(businessId).then((r) => {
      if (cancelled) return;
      if (r.ok) setCreds(r.value.filter((c) => c.professionalId === id));
      else setCredError(true);
    });
    void fetchReviewsFor(id).then((r) => {
      if (cancelled || !r.ok) return;
      const n = r.reviews.length;
      if (n < MIN_REVIEWS_FOR_AVERAGE) setRating("No reviews yet");
      else setRating(`${(r.reviews.reduce((a, x) => a + x.rating, 0) / n).toFixed(1)} average rating`);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, accepted, id]);

  const upcoming = useMemo(() => sessions.filter((s) => s.professionalId === id && s.date >= today), [sessions, id, today]);
  const thisWeek = weekRange(today, 0);
  const weekCount = sessions.filter((s) => s.professionalId === id && s.date >= thisWeek.from && s.date <= thisWeek.to).length;
  const firstThree = upcoming.slice(0, 3);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(firstThree.map(async (s) => [s.id, await fetchBooked(s.id, s.capacity)] as const)).then((pairs) => {
      if (!cancelled) setBooked(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the three ids
  }, [firstThree.map((s) => s.id).join()]);

  if (!person) {
    return (
      <TeamScope detail>
        <BackRow label={TEAM_TITLE[kind]} onBack={back} />
        {error && <Notice message={error} onRetry={data.reload} />}
        {!error && people && (
          <div className="tm-rq-card">
            <div className="tm-empty">
              <span className="tm-empty-tile">
                <UserMinus size={22} />
              </span>
              <p className="tm-empty-t">This person is no longer on your team.</p>
              <button type="button" className="tm-link tap" onClick={back}>
                Back to team
              </button>
            </div>
          </div>
        )}
        {!error && !people && <p className="tm-subtitle">Loading…</p>}
      </TeamScope>
    );
  }

  const name = person.name;
  const first = firstWord(name);
  const acts = accepted
    ? [
        { t: "Message", i: <MessageCircle size={17} strokeWidth={2.1} />, on: () => void openChat(), dis: chatBusy, red: false },
        { t: "Schedule", i: <CalendarDays size={17} strokeWidth={2.1} />, on: () => navigate("/app/business/classes"), dis: false, red: false },
        { t: "Cover", i: <Repeat2 size={17} strokeWidth={2.1} />, on: () => showToast("Finding cover is coming soon."), dis: false, red: false },
      ]
    : [
        { t: "Message", i: <MessageCircle size={17} strokeWidth={2.1} />, on: () => void openChat(), dis: chatBusy, red: false },
        { t: "Cancel invite", i: <UserX size={17} strokeWidth={2.1} />, on: () => setConfirm(true), dis: offline, red: true },
      ];

  const doRemove = async () => {
    if (!businessId) return;
    setBusy(true);
    setRemoveError(null);
    const r = await removeTeamMember(businessId, id);
    setBusy(false);
    if (!r.ok) return setRemoveError(r.message ?? "Couldn't remove them. Try again.");
    setConfirm(false);
    data.setPeople((people ?? []).filter((p) => p.professionalId !== id));
    navigate("/app/business/employees", {
      state: { toast: accepted ? `${name} was removed from your team.` : `${name}'s invite was cancelled.` },
    });
  };

  const futureCount = upcoming.length;
  const removeBody = accepted
    ? futureCount > 0
      ? `Their ${futureCount} upcoming session${futureCount === 1 ? "" : "s"} will need a new instructor. This frees a seat.`
      : "This frees a seat."
    : "The invite stops working and they won't be able to accept it.";

  return (
    <TeamScope detail>
      <BackRow label={TEAM_TITLE[kind]} onBack={back} />
      {offline && <Notice message="You're offline." />}
      <div className="tm-dhead">
        <Avatar name={name} url={accepted ? person.avatarUrl : null} className={accepted ? "tm-dav" : "tm-dav invited"} />
        <div className="tm-dhead-b">
          <p className="tm-dname">
            <b>{name}</b>
            <span className={accepted ? "tm-pill" : "tm-pill inv"}>{accepted ? "Active" : "Invited"}</span>
          </p>
          <p className="tm-ds1">
            {accepted ? `${ROLE_LABEL[person.role]} · joined ${longDate(person.acceptedAt!)}` : `${ROLE_LABEL[person.role]} · invited ${dayDate(localDayOf(person.invitedAt))}`}
          </p>
          <p className="tm-ds2">
            {accepted ? `${weekCount} session${weekCount === 1 ? "" : "s"} this week` + (rating ? ` · ${rating}` : "") : "Hasn't accepted yet"}
          </p>
        </div>
      </div>

      <div className="tm-acts" style={{ gridTemplateColumns: `repeat(${acts.length}, minmax(0, 1fr))` }}>
        {acts.map((a) => (
          <button key={a.t} type="button" className={a.red ? "tm-act red tap" : "tm-act tap"} disabled={a.dis} onClick={a.on}>
            {a.i}
            {a.t}
          </button>
        ))}
      </div>
      {chatError && <Notice message={chatError} />}

      <DCard title="Role">
        <Row
          title={ROLE_DOES[person.role]}
          sub="Changing a role is coming soon."
          trailing={
            <button type="button" className="tm-pick tm-hit" disabled aria-label={`Role: ${ROLE_LABEL[person.role]}. Changing a role is coming soon.`}>
              {ROLE_LABEL[person.role]}
              <ChevronDown size={14} />
            </button>
          }
        />
      </DCard>

      <DCard title="Credentials" right={`From ${first}'s profile`}>
        {!accepted && <Row icon={<FileBadge size={16} />} title="Certification" sub={`Shows once ${first} accepts the invite.`} />}
        {accepted && credError && <Row title="Couldn't load credentials." />}
        {accepted && !credError && creds === null && <Row title="Loading…" />}
        {accepted &&
          creds &&
          (creds.filter((c) => c.licenceName).length === 0 ? (
            <Row icon={<FileBadge size={16} />} title="Certification" sub="Not added yet" />
          ) : (
            creds
              .filter((c) => c.licenceName)
              .map((c, i) => (
                <Row
                  key={i}
                  icon={<Award size={16} />}
                  title={c.licenceName!}
                  sub={[
                    c.issuingBody,
                    c.issuedOn ? `Issued ${c.issuedOn.slice(0, 4)}` : null,
                    c.verified ? "Verified by Centium" : "Not verified yet",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))
          ))}
        <p className="tm-note">{`Added by ${name} in their professional profile. Only they can change it.`}</p>
      </DCard>

      {accepted && (
        <DCard title="Upcoming sessions" right={`${weekCount} this week`}>
          {firstThree.length === 0 && <Row icon={<CalendarClock size={16} />} title="No upcoming sessions" />}
          {firstThree.map((s) => {
            const clash = clashOf(s, upcoming);
            const b = booked[s.id];
            return (
              <Row
                key={s.id}
                icon={clash ? <TriangleAlert size={16} /> : <CalendarClock size={16} />}
                title={s.title}
                sub={
                  `${dayWord(s.date, today)} · ${range12(s.start, s.end)}` +
                  (clash ? ` · clashes with ${clash.title}` : b === undefined || b === null ? "" : b >= s.capacity ? " · full" : ` · ${b} of ${s.capacity} booked`)
                }
              />
            );
          })}
          {upcoming.length > 3 && (
            <button type="button" className="tm-more tap" onClick={() => navigate("/app/business/classes")}>
              {`See all ${upcoming.length}`}
            </button>
          )}
        </DCard>
      )}

      {businessId && (
        <AvailabilityCard
          businessId={businessId}
          professionalId={id}
          firstName={first}
          sessions={sessions}
          today={today}
          onAsk={() => void openChat()}
          askBusy={chatBusy}
        />
      )}

      {accepted && (
        <button type="button" className="tm-danger tap" disabled={offline} onClick={() => setConfirm(true)}>
          <UserMinus size={16} strokeWidth={2.2} />
          Remove from team
        </button>
      )}

      <ConfirmCard
        open={confirm}
        layout="stacked"
        tone="destructive"
        destructiveFill="solid"
        cancelVariant="outlined"
        initialFocus="cancel"
        scrimBlur
        icon={accepted ? <UserMinus size={20} strokeWidth={2.2} /> : <UserX size={20} strokeWidth={2.2} />}
        title={accepted ? `Remove ${name} from your team?` : `Cancel ${name}'s invite?`}
        subtitle={removeBody}
        extra={removeError ? <p className="tm-sh-err" role="alert" style={{ color: "rgb(var(--c-status-high))" }}>{removeError}</p> : undefined}
        confirmLabel={busy ? (accepted ? "Removing…" : "Cancelling…") : accepted ? "Remove" : "Cancel invite"}
        cancelLabel="Keep it"
        busy={busy}
        onCancel={() => {
          setConfirm(false);
          setRemoveError(null);
        }}
        onConfirm={() => void doRemove()}
      />
      {toast}
    </TeamScope>
  );
}

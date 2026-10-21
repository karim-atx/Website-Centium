import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AtSign, Award, Briefcase, CalendarClock, CalendarDays, Dumbbell, FileBadge, Globe, MessageCircle, Quote, Repeat2, Send, TriangleAlert, UserMinus, UserX } from "lucide-react";
import { InstagramGlyph } from "../../components/business-more/InstagramGlyph";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { useSchedule } from "../business-ops/classes/useSchedule";
import { useSessionActions } from "../business-ops/classes/SessionActions";
import { isEnded, shortDate } from "../business-ops/classes/scheduleModel";
import { time12 } from "../../utils/time12";
import { useOpenThread } from "../../components/messages/useOpenThread";
import { removeTeamMember } from "../../services/business-team";
import { fetchBooked, fetchCredentials, fetchPublicDetails, reinviteTeamMember, resendTeamInvite, revokeTeamInvite, type Credential, type PublicDetails } from "../../services/business-team/team";
import { personUsesSeat } from "../../services/business-team/seats";
import { fetchReviewsFor } from "../../services/professional-reviews";
import { MIN_REVIEWS_FOR_AVERAGE } from "../../services/professional-reviews/rules";
import { range12 } from "../../utils/time12";
import { localDayOf } from "../../utils/date";
import { AvailabilityCard } from "./AvailabilityCard";
import { PermissionsCard, RoleCard } from "./PersonTerms";
import { SeatsFullSheet } from "./TeamSheets";
import { Avatar, BackRow, DCard, LinkRow, Notice, Row, TeamScope, isOfflineNow, useTeamToast } from "./parts";
import { inviteState, inviteWhen, isWithdrawn, jobRow, profileLink, shortDay, specialtySub } from "./teamLogic";
import { ROLE_LABEL, roleAndProfession, teamTitle, seatCounts, clashOf, dayDate, dayWord, firstWord, isAccepted, longDate, weekRange } from "./teamLogic";
import type { TeamData } from "./useTeamData";

// OP1-061 / 130 (person page), 063 / 132 (credentials), 064 (remove
// confirm), 134-139 (availability), 138 (invited person). Source order: back
// row, header, actions, Role, Credentials, Upcoming sessions, Availability,
// What they can do, Remove from team.
//
// Cover (OP1-061 S3, OP1-130 S3): "Request a substitute" (the Schedule's
// SubstituteSheet, B9 assign_class_instructor) for this person's next
// session; with more than one to come, a session picker first.
//
// Specialty, jobs, bio and links (OP1-132 C1, C2, C5, C6) come from what the
// professional lists publicly (public_professional_directory /
// public_professional_experience). An unlisted professional (affiliating
// turns listing off) shows none of those rows: only their licences.

export function PersonPage({ data }: { data: TeamData }) {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { kind, people, sessions, today, businessId, error, readOnly } = data;
  const person = people?.find((p) => p.professionalId === id) ?? null;
  const [toast, showToast] = useTeamToast();
  const [confirm, setConfirm] = useState(false);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [reinviting, setReinviting] = useState(false);
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [credError, setCredError] = useState(false);
  const [rating, setRating] = useState<string | null>(null);
  const [details, setDetails] = useState<PublicDetails | null>(null);
  const [booked, setBooked] = useState<Record<string, number | null>>({});
  const { open: openChat, busy: chatBusy, error: chatError } = useOpenThread(id);
  const offline = isOfflineNow();
  const accepted = !!person && isAccepted(person);
  const back = () => navigate("/app/business/employees");
  // Cover: the Schedule's store and actions (the same sheet, toast and assign as the Schedule).
  const schedule = useSchedule();
  const sessionActions = useSessionActions(schedule);
  const [coverMenu, setCoverMenu] = useState<HTMLElement | null>(null);
  const toCover = useMemo(() => {
    const now = new Date();
    return schedule.sessions
      .filter((s) => s.professionalId === id && !s.cancelled && !isEnded(s, now))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [schedule.sessions, id]);

  useEffect(() => {
    if (!businessId || !accepted) return;
    let cancelled = false;
    void fetchCredentials(businessId).then((r) => {
      if (cancelled) return;
      if (r.ok) setCreds(r.value.filter((c) => c.professionalId === id));
      else setCredError(true);
    });
    void fetchPublicDetails(id).then((r) => {
      if (!cancelled && r.ok) setDetails(r.value);
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
        <BackRow label={teamTitle(kind, data.kindKnown)} onBack={back} />
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
  // Batch 2 CO: the invite's window (expires_at, revoked_at), when the read returned it.
  const expired = !accepted && inviteState(person) === "expired";
  // A withdrawn invitation can't be resent or withdrawn; the owner can invite
  // them again (reinvite_revoked_team_member), which opens a new window.
  const withdrawn = isWithdrawn(person);
  const when = accepted ? null : inviteWhen(person);
  const acts = withdrawn
    ? readOnly
      ? []
      : [{ t: reinviting ? "Sending…" : "Invite again", i: <Send size={17} strokeWidth={2.1} />, on: () => void doReinvite(), dis: offline || reinviting, red: false }]
    : accepted
    ? [
        { t: "Message", i: <MessageCircle size={17} strokeWidth={2.1} />, on: () => void openChat(), dis: chatBusy, red: false },
        { t: "Schedule", i: <CalendarDays size={17} strokeWidth={2.1} />, on: () => navigate("/app/business/classes"), dis: false, red: false },
        {
          t: "Cover",
          i: <Repeat2 size={17} strokeWidth={2.1} />,
          on: (el: HTMLElement) => {
            if (toCover.length === 0) showToast(`${first} has no upcoming sessions to cover.`);
            else if (toCover.length === 1) sessionActions.openSubstitute(toCover[0].id);
            else setCoverMenu(el);
          },
          dis: offline || schedule.loading,
          red: false,
        },
      ]
    : [
        { t: "Message", i: <MessageCircle size={17} strokeWidth={2.1} />, on: () => void openChat(), dis: chatBusy, red: false },
        // B7: business_employees writes stay the owner's. Batch 2 CO: Resend
        // (resend_team_invite) and Withdraw (revoke_team_invite) replace the
        // old Cancel invite, which deleted the pending row.
        ...(readOnly
          ? []
          : [
              { t: resending ? "Resending…" : "Resend", i: <Send size={17} strokeWidth={2.1} />, on: () => void doResend(), dis: offline || resending, red: false },
              { t: "Withdraw", i: <UserX size={17} strokeWidth={2.1} />, on: () => setConfirm(true), dis: offline || resending, red: true },
            ]),
      ];

  const doResend = async () => {
    if (!businessId || resending) return;
    setResending(true);
    const r = await resendTeamInvite(businessId, id);
    setResending(false);
    if (!r.ok) {
      showToast(r.message, true);
      if (r.refresh) data.reload();
      return;
    }
    // The new window is the function's answer; the rest of the row is unchanged.
    if (r.at) {
      const prev = person.invite;
      data.setPeople(
        (people ?? []).map((p) =>
          p.professionalId === id
            ? { ...p, invite: { expiresAt: r.at, revokedAt: null, sentAt: new Date().toISOString(), resentCount: (prev?.resentCount ?? 0) + 1 } }
            : p
        )
      );
    }
    showToast(r.at ? `Invite resent. It now expires ${shortDay(r.at)}.` : "Invite resent.");
  };

  const doReinvite = async () => {
    if (!businessId || reinviting) return;
    // A revived invite holds a seat again. The function checks for a free
    // one (ATXC0, 251ab70); this first check offers more seats without the
    // round trip, as inviting someone new does.
    if (personUsesSeat(person) && seatCounts(people ?? [], data.capacity?.capacity ?? 0, data.capacity).free <= 0) return setFull(true);
    setReinviting(true);
    // No new note: the server keeps the one they were first sent.
    const r = await reinviteTeamMember(businessId, id, null);
    setReinviting(false);
    if (!r.ok) {
      // The server found no free seat (the counts moved): the same Seats full sheet.
      if (r.noSeats) {
        data.reload();
        return setFull(true);
      }
      showToast(r.message, true);
      if (r.refresh) data.reload();
      return;
    }
    const prev = person.invite;
    data.setPeople(
      (people ?? []).map((p) =>
        p.professionalId === id
          ? { ...p, invite: { expiresAt: r.at ?? prev?.expiresAt ?? null, revokedAt: null, sentAt: new Date().toISOString(), resentCount: (prev?.resentCount ?? 0) + 1 } }
          : p
      )
    );
    showToast(r.at ? `Invite sent again. It expires ${shortDay(r.at)}.` : "Invite sent again.");
  };

  const doRemove = async () => {
    if (!businessId) return;
    setBusy(true);
    setRemoveError(null);
    let revokedAt: string | null = null;
    if (accepted) {
      const r = await removeTeamMember(businessId, id);
      setBusy(false);
      if (!r.ok) return setRemoveError(r.message ?? "Couldn't remove them. Try again.");
    } else {
      const r = await revokeTeamInvite(businessId, id);
      if (r.ok) revokedAt = r.at;
      setBusy(false);
      if (!r.ok) {
        if (!r.refresh) return setRemoveError(r.message);
        // The invite changed under us (accepted, or gone): close and read again.
        setConfirm(false);
        showToast(r.message, true);
        data.reload();
        return;
      }
    }
    setConfirm(false);
    // Batch 2 CO: a withdrawn invite stays listed as "Withdrawn {date}" (the row is kept).
    data.setPeople(
      accepted
        ? (people ?? []).filter((p) => p.professionalId !== id)
        : (people ?? []).map((p) =>
            p.professionalId === id
              ? { ...p, invite: { expiresAt: p.invite?.expiresAt ?? null, sentAt: p.invite?.sentAt ?? null, resentCount: p.invite?.resentCount ?? 0, revokedAt: revokedAt ?? new Date().toISOString() } }
              : p
          )
    );
    navigate("/app/business/employees", {
      state: { toast: accepted ? `${name} was removed from your team.` : `${name}'s invite was withdrawn.` },
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
      <BackRow label={teamTitle(kind, data.kindKnown)} onBack={back} />
      {offline && <Notice message="You're offline." />}
      <div className="tm-dhead">
        <Avatar name={name} url={accepted ? person.avatarUrl : null} className={accepted ? "tm-dav" : "tm-dav invited"} />
        <div className="tm-dhead-b">
          <p className="tm-dname">
            <b>{name}</b>
            <span className={accepted ? "tm-pill" : expired || withdrawn ? "tm-pill exp" : "tm-pill inv"}>{accepted ? "Active" : withdrawn ? "Withdrawn" : expired ? "Expired" : "Invited"}</span>
          </p>
          <p className="tm-ds1">
            {(accepted ? `${roleAndProfession(person)} · joined ${longDate(person.acceptedAt!)}` : `${ROLE_LABEL[person.role]} · invited ${dayDate(localDayOf(person.invitedAt))}`) + (personUsesSeat(person) ? "" : " · no seat needed")}
          </p>
          <p className="tm-ds2">
            {accepted ? `${weekCount} session${weekCount === 1 ? "" : "s"} this week` + (rating ? ` · ${rating}` : "") : withdrawn ? (when ?? "Withdrawn") : "Hasn't accepted yet" + (when ? ` · ${when}` : "")}
          </p>
        </div>
      </div>

      {acts.length > 0 && <div className="tm-acts" style={{ gridTemplateColumns: `repeat(${acts.length}, minmax(0, 1fr))` }}>
        {acts.map((a) => (
          <button key={a.t} type="button" className={a.red ? "tm-act red tap" : "tm-act tap"} disabled={a.dis} onClick={(e) => a.on(e.currentTarget)} aria-haspopup={a.t === "Cover" && toCover.length > 1 ? "menu" : undefined}>
            {a.i}
            {a.t}
          </button>
        ))}
      </div>}
      {chatError && <Notice message={chatError} />}
      {expired && !readOnly && <p className="tm-note" role="note" style={{ marginTop: 10, borderTop: "none", padding: "0 2px" }}>{`This invite has expired, so ${first} can't accept it. Resend it to give them another 14 days.`}</p>}
      {withdrawn && <p className="tm-note" role="note" style={{ marginTop: 10, borderTop: "none", padding: "0 2px" }}>{readOnly ? `This invite was withdrawn, so ${first} can't accept it.` : `This invite was withdrawn, so ${first} can't accept it. Invite them again to give them another 14 days.`}</p>}

      <RoleCard
        person={person}
        kind={kind}
        disabled={offline || readOnly || withdrawn}
        onSaved={data.reload}
        onToast={showToast}
        onNoSeats={() => setFull(true)}
      />

      <DCard title="Credentials" right={`From ${first}'s profile`}>
        {!accepted && <Row icon={<FileBadge size={16} />} title="Certification" sub={`Shows once ${first} accepts the invite.`} />}
        {accepted && details && specialtySub(details, today) && <Row icon={<Dumbbell size={16} />} title="Specialty" sub={specialtySub(details, today)!} />}
        {accepted &&
          details?.experience.map((job, i) => {
            const j = jobRow(job);
            return <Row key={`job-${i}`} icon={<Briefcase size={16} />} title={j.title} sub={j.sub ?? undefined} />;
          })}
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
        {accepted && details?.bio && <Row icon={<Quote size={16} />} title="Bio" sub={details.bio} />}
        {accepted &&
          details &&
          (
            [
              ["website", "Website", <Globe key="g" size={16} />],
              ["instagram", "Instagram", <InstagramGlyph key="i" size={16} />],
              ["x", "X", <AtSign key="x" size={16} />],
            ] as const
          ).map(([k, title, icon]) => {
            const raw = details[k];
            if (!raw) return null;
            const l = profileLink(k, raw);
            return l.href ? (
              <LinkRow key={k} icon={icon} title={title} sub={l.text} href={l.href} label={`${title}: ${l.text} (opens in a new tab)`} />
            ) : (
              <Row key={k} icon={icon} title={title} sub={l.text} />
            );
          })}
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

      <PermissionsCard key={person.permissions.join()} person={person} disabled={offline || readOnly || withdrawn} onSaved={data.reload} onToast={showToast} readOnly={readOnly || withdrawn} />

      {accepted && !readOnly && (
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
        title={accepted ? `Remove ${name} from your team?` : `Withdraw ${name}'s invite?`}
        subtitle={removeBody}
        extra={removeError ? <p className="tm-sh-err" role="alert" style={{ color: "rgb(var(--c-status-high))" }}>{removeError}</p> : undefined}
        confirmLabel={busy ? (accepted ? "Removing…" : "Withdrawing…") : accepted ? "Remove" : "Withdraw invite"}
        cancelLabel="Keep it"
        busy={busy}
        onCancel={() => {
          setConfirm(false);
          setRemoveError(null);
        }}
        onConfirm={() => void doRemove()}
      />
      {/* Cover with more than one session to come: which one (OURS, the source sheet assumes one). */}
      <PopupMenu
        open={!!coverMenu}
        anchor={coverMenu}
        onClose={() => setCoverMenu(null)}
        heading="Which session?"
        width={240}
        options={toCover.slice(0, 8).map((s) => ({
          value: s.id,
          label: s.title,
          note: `${s.date === today ? "Today" : shortDate(s.date)} · ${time12(s.startTime)}`,
        }))}
        onSelect={(v) => {
          setCoverMenu(null);
          sessionActions.openSubstitute(v);
        }}
      />
      {sessionActions.elements}
      <SeatsFullSheet open={full} onClose={() => setFull(false)} businessId={businessId} counts={seatCounts(people ?? [], data.capacity?.capacity ?? 0, data.capacity)} />
      {toast}
    </TeamScope>
  );
}

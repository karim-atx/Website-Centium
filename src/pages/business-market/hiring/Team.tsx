import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MarketAvatar, TicketCheck } from "../../../components/market/ProfessionalCard";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { useOnline } from "../../../hooks/useOnline";
import { fetchMyTeam, removeFromTeam, type TeamMember } from "../../../services/hiring";
import { startThread } from "../../../services/messaging";
import { BackHeader, CentredDialog, lh, px, useMarketColors, useStrip } from "../listingParts";
import { HIRING_ROUTES } from "./HiringRoutes";
import { useHiringBusiness } from "./useHiringBusiness";
import { ExistingTeamChip, HiringEmpty, NotForThisBusiness, PaleNote, PEOPLE_ICON } from "./teamParts";
import { classLine, classTile, firstName, hireLine, removeConfirmBody, removeSentence } from "./teamModel";

// Market + Share 3.0 · W4-B · B-MA.8.4 Team (Business Hiring Screens lines
// 156–185, `M()` / teamList / menu / teamRemove1–2 / teamRemoved / teamEmpty;
// frame-check B-MA.8.4, 6 states). Back header "Hiring / Team"; the pale note;
// one card per Team member (my_team, DB8): avatar 48, name 15 / 800 / 20,
// specialty 12 --ink2, the hire line (ticket-check 12, 11 / 700 --tealink)
// or, for a member added free in the window, the B-MA.8.8 "Free · existing
// team" label; the ⋮ (32, radius 10, --pale while its menu is open); one row
// per assigned class (52-wide time tile, 12-hour). The menu (PopupMenu tint,
// the board's 184-wide card): View profile → the professional's profile;
// Assign classes → Classes (/app/business/classes), where the instructor is
// picked per class; Message → the live direct thread (start_message_thread,
// as Classes' "Message instructor" does) in Messages; Remove from team → two
// CentredDialogs → remove_from_team ⟳ → strip "{name} removed from your
// team" · Done. Empty: "No one on your team yet" + Post an opening.
// Database Release 2: my_team (the current team; removed people are left out) and
// remove_from_team (ends their hires, clears them from future sessions, no refund).

type Load = { status: "loading" } | { status: "ok"; team: TeamMember[] } | { status: "pending" } | { status: "error" };

export default function TeamPage() {
  const biz = useHiringBusiness();
  const m = useMarketColors();
  const navigate = useNavigate();
  const online = useOnline();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [menu, setMenu] = useState<{ member: TeamMember; anchor: HTMLElement } | null>(null);
  const [removing, setRemoving] = useState<{ member: TeamMember; step: 1 | 2 } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const [strip, showStrip] = useStrip();
  const businessId = biz.canHire ? biz.businessId : null;

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    setLoad({ status: "loading" });
    void fetchMyTeam(businessId).then((r) => {
      if (!alive) return;
      setLoad(r.ok ? { status: "ok", team: r.value } : r.pending ? { status: "pending" } : { status: "error" });
    });
    return () => {
      alive = false;
    };
  }, [businessId, tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);
  const back = () => navigate(HIRING_ROUTES.hub);
  const postOpening = () => navigate(`${HIRING_ROUTES.hub}?post=1`);

  const message = async (member: TeamMember) => {
    const r = await startThread(member.professional.id);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else showStrip("Couldn't open the chat. Try again.", "error");
  };

  const onMenu = (member: TeamMember, v: "profile" | "assign" | "message" | "remove") => {
    setMenu(null);
    if (v === "profile") navigate(`/app/professionals/${encodeURIComponent(member.professional.id)}`);
    else if (v === "assign") navigate("/app/business/classes");
    else if (v === "message") void message(member);
    else {
      setDlgError(null);
      setRemoving({ member, step: 1 });
    }
  };

  const confirmRemove = async () => {
    if (!removing || !businessId || busy) return;
    if (!online) {
      setDlgError("You're offline. Try again when you're connected.");
      return;
    }
    setBusy(true);
    setDlgError(null);
    const r = await removeFromTeam(businessId, removing.member.professional.id);
    setBusy(false);
    if (!r.ok) {
      setDlgError(r.message);
      return;
    }
    const gone = removing.member;
    setRemoving(null);
    setLoad((l) => (l.status === "ok" ? { status: "ok", team: l.team.filter((t) => t.professional.id !== gone.professional.id) } : l));
    showStrip(`${gone.professional.name} removed from your team`);
  };

  const header = <BackHeader eyebrow="Hiring" title="Team" onBack={back} backLabel="Back to Hiring" />;
  const note = <PaleNote>Your Team are the professionals you hired through Hiring. Only they can be named as class instructors.</PaleNote>;

  let body: React.ReactNode;
  if (biz.loading || (businessId && load.status === "loading")) {
    body = (
      <>
        {note}
        <MarketSkeleton radius={20} rows={3} height={147} count={2} label="Loading your team" style={{ marginTop: 12 }} />
      </>
    );
  } else if (!biz.canHire || !businessId) {
    body = <NotForThisBusiness error={biz.error} onRetry={biz.reload} />;
  } else if (load.status === "error") {
    body = (
      <>
        {note}
        <MarketError thing="your team" onRetry={retry} style={{ marginTop: 12 }} />
      </>
    );
  } else if (load.status === "pending" || (load.status === "ok" && load.team.length === 0)) {
    body = (
      <>
        {note}
        <HiringEmpty
          icon={PEOPLE_ICON}
          title="No one on your team yet"
          body="Professionals you hire through Hiring show here, with their classes. Until then, classes show Instructor not listed."
          action={load.status === "ok" ? { label: "Post an opening", onPress: postOpening } : undefined}
          top={40}
        />
      </>
    );
  } else if (load.status === "ok") {
    body = (
      <>
        {note}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {load.team.map((t) => {
            const id = t.professional.id;
            const line = hireLine(t.hires);
            const open = menu?.member.professional.id === id;
            return (
              <div key={id} data-member style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px 10px", display: "flex", gap: 12, alignItems: "center" }}>
                  <MarketAvatar id={id} name={t.professional.name} photoUrl={t.professional.photoUrl} size={48} fontSize={15} />
                  <div style={{ flex: 1, minWidth: 0, lineHeight: "normal" }}>
                    <div style={{ fontSize: px(15), fontWeight: 800, lineHeight: lh(20), color: m.ink }}>{t.professional.name}</div>
                    {t.professional.specialty ? <div style={{ fontSize: px(12), color: m.ink2 }}>{t.professional.specialty}</div> : null}
                    {t.source === "existing_team" ? <ExistingTeamChip /> : null}
                    {line ? (
                      <div style={{ marginTop: 3, display: "inline-flex", alignItems: "center", gap: 5, fontSize: px(11), fontWeight: 700, color: m.tealink }}>
                        <TicketCheck size={12} />
                        {line}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`Options for ${t.professional.name}`}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={(e) => setMenu(open ? null : { member: t, anchor: e.currentTarget })}
                    className="hit market-focus"
                    style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink2, background: open ? m.pale : "transparent", border: 0, padding: 0, flexShrink: 0, cursor: "pointer" }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                </div>
                {t.classes.map((c, i) => {
                  const tile = classTile(c);
                  return (
                    <div key={`${c.seriesId ?? c.title}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", borderTop: `0.5px solid ${m.div}`, lineHeight: "normal" }}>
                      <span style={{ width: 52, flexShrink: 0, textAlign: "center", borderRadius: 10, background: m.pale, padding: "6px 0" }}>
                        <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: m.ink }}>{tile.time}</span>
                        <span style={{ display: "block", fontSize: px(9.5), fontWeight: 700, color: m.faint }}>{tile.day}</span>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: px(13.5), fontWeight: 700, color: m.ink }}>{c.title}</div>
                        {classLine(c) ? <div style={{ fontSize: px(11.5), color: m.faint }}>{classLine(c)}</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const r = removing;
  return (
    <div style={{ color: m.ink, lineHeight: "normal", paddingBottom: 32 }}>
      <style>{FOCUS_CSS}</style>
      {header}
      {body}
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        width={184}
        align="right"
        options={[
          { value: "profile", label: "View profile" },
          { value: "assign", label: "Assign classes" },
          { value: "message", label: "Message" },
          { value: "remove", label: "Remove from team", destructive: true },
        ]}
        onSelect={(v) => menu && onMenu(menu.member, v as "profile" | "assign" | "message" | "remove")}
      />
      {/* One dialog through both steps, so focus returns to the ⋮ once it closes. */}
      <CentredDialog
        open={!!r}
        width={338}
        pad="24px 22px 22px"
        actionsTop={18}
        title={!r ? "" : r.step === 1 ? `Remove ${firstName(r.member.professional.name)} from your team?` : "Confirm remove"}
        body={!r ? undefined : r.step === 1 ? (removeSentence(r.member.classes) ?? undefined) : removeConfirmBody(r.member)}
        cancel="Cancel"
        action={r?.step === 2 ? "Remove from team" : "Remove"}
        busy={busy}
        error={r?.step === 2 ? dlgError : null}
        onCancel={() => !busy && setRemoving(null)}
        onAction={() => (r?.step === 1 ? setRemoving({ member: r.member, step: 2 }) : void confirmRemove())}
      />
      {strip}
    </div>
  );
}

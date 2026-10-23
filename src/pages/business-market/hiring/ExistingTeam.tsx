import { useCallback, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MarketAvatar } from "../../../components/market/ProfessionalCard";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { hexAlpha, liftInk } from "../../../components/market/marketColor";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { sheetChipStyle } from "../../../components/ui/sheetChip";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { STATUS_STEPS, marketPalette } from "../../../theme/marketTokens";
import {
  addExistingTeam,
  fetchExistingTeamWindow,
  fetchMyTeam,
  inviteExistingTeam,
  searchProfessionals,
  windowUsed,
  type ExistingTeamWindow,
  type ProCard,
  type ProfessionalType,
  type TeamMember,
} from "../../../services/hiring";
import { BackHeader, CapsLabel, CentredDialog, MasterSheet, PrimaryButton, SaveError, SheetBox, SoonNote, fieldStyle, lh, px, useStrip } from "../listingParts";
import { HIRING_ROUTES } from "./HiringRoutes";
import { useHiringBusiness } from "./useHiringBusiness";
import { DialogRows, ExistingTeamChip, NotForThisBusiness, SheetNote } from "./teamParts";
import { PRO_TYPE_CHIPS, addCta, addTitle, addedDuringWindow, addedStrip, countdownParts, fullDate, inviteNote, isEmailOrPhone, windowPct } from "./teamModel";

// Market + Share 3.0 · W4-B · B-MA.8.8 Add your existing team (Business
// Hiring Screens lines 227–265 + the `ETP` / `et` / etInvite / etConfirm /
// etDone script; frame-check B-MA.8.8, 6 states).
// D-31 as the server computes it (existing_team_window, Database Release 2):
// greatest(the business's created_at, platform_settings
// existing_team_window_opens_at) + existing_team_window_days. CLOSED, with no
// dates, until Karim sets the start: this page then says the window hasn't
// started (ours; the board draws only open and closed). Free: no hiring
// fee and, since Database #38, no paid seat (every Team professional is
// seat-free), so the confirm dialog never meets the seat cap.
// Open: the countdown card on #E6F1EF ("Free for your first 30 days", "Closes
// {date}", the days figure 34 / 800, the bar = windowUsed), the explainer;
// search (name or specialty: search_professionals with p_existing_team);
// people rows with "Add free" → "Selected" (multi-select), "Free · existing
// team" once added; "Invite by email or phone" → the sheet (Email or phone,
// Name, "They are a" chips, the note, Send invite → invite_existing_team ⟳);
// the note that front desk and other staff join through More › Team and
// access (→ the live Team page, /app/business/employees); then, with a
// selection, "Add {n} professionals · free" → CentredDialog → add_existing_team
// ⟳ → strip "{n} professionals added to your team · free" · Team.
// Closed (day 31): the grey card, Post an opening (→ the hub, ?post=1 asks it
// to open the post sheet) / Find a professional (→ find), and the people
// added during the window (my_team, source existing_team).
// A failed window read: the error card with Retry.

type Load<T> = { status: "loading" } | { status: "ok"; value: T } | { status: "pending" } | { status: "error" };

export default function ExistingTeamPage() {
  const biz = useHiringBusiness();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const online = useOnline();
  const [strip, showStrip] = useStrip();
  const businessId = biz.canHire ? biz.businessId : null;

  const [win, setWin] = useState<Load<ExistingTeamWindow | null>>({ status: "loading" });
  const [team, setTeam] = useState<Load<TeamMember[]>>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    setWin({ status: "loading" });
    void fetchExistingTeamWindow(businessId).then((r) => alive && setWin(r.ok ? { status: "ok", value: r.value } : r.pending ? { status: "pending" } : { status: "error" }));
    void fetchMyTeam(businessId).then((r) => alive && setTeam(r.ok ? { status: "ok", value: r.value } : r.pending ? { status: "pending" } : { status: "error" }));
    return () => {
      alive = false;
    };
  }, [businessId, tick]);

  const w = win.status === "ok" ? win.value : null;
  const isOpen = !!w && w.open;

  // Search (window open only).
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Load<ProCard[]>>({ status: "loading" });
  useEffect(() => {
    if (!businessId || !isOpen) return;
    let alive = true;
    setResults({ status: "loading" });
    const id = window.setTimeout(() => {
      void searchProfessionals(businessId, q, true).then((r) => alive && setResults(r.ok ? { status: "ok", value: r.value } : r.pending ? { status: "pending" } : { status: "error" }));
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [businessId, isOpen, q, tick]);

  // Selection and what was added here.
  const [picked, setPicked] = useState<Map<string, ProCard>>(new Map());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const sourceOf = new Map((team.status === "ok" ? team.value : []).map((t) => [t.professional.id, t.source] as const));
  const toggle = (p: ProCard) =>
    setPicked((cur) => {
      const next = new Map(cur);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });

  // Confirm.
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);
  const addNow = async () => {
    if (!businessId || busy) return;
    if (!online) return setDlgError("You're offline. Try again when you're connected.");
    const people = [...picked.values()];
    setBusy(true);
    setDlgError(null);
    const r = await addExistingTeam(businessId, people.map((p) => p.id));
    setBusy(false);
    if (!r.ok) {
      setDlgError(r.message);
      if (r.error === "window_closed") retry();
      return;
    }
    setConfirming(false);
    setAdded((cur) => new Set([...cur, ...people.map((p) => p.id)]));
    setPicked(new Map());
    showStrip(addedStrip(people.length), "success", { label: "Team", onPress: () => navigate(HIRING_ROUTES.team) });
    void fetchMyTeam(businessId).then((t) => t.ok && setTeam({ status: "ok", value: t.value }));
  };

  // Invite sheet.
  const [inviteOpen, setInviteOpen] = useState(false);

  const back = () => navigate(HIRING_ROUTES.hub);
  const header = <BackHeader eyebrow="Hiring" title="Add your existing team" onBack={back} backLabel="Back to Hiring" />;

  const fixedBg = (hue: string, light: string) => (dark ? hexAlpha(hue, 0.16) : light);
  const [tealBg, tealHue] = STATUS_STEPS.HIRED;
  const tealInk = dark ? m.tealink : "#2F5F58";
  const tealLine = dark ? liftInk(tealHue) : tealHue;

  let body: React.ReactNode;
  if (biz.loading || (businessId && win.status === "loading")) {
    body = <MarketSkeleton radius={20} rows={4} height={183} label="Loading your free window" />;
  } else if (!biz.canHire || !businessId) {
    body = <NotForThisBusiness error={biz.error} onRetry={biz.reload} />;
  } else if (win.status === "error") {
    body = <MarketError thing="your free window" onRetry={retry} />;
  } else if (win.status === "pending" || !w) {
    body = <MarketEmptyCard title="Hiring is coming soon." body="Professionals who already work with you join free during your first 30 days. You add them here." />;
  } else if (!isOpen && !w.opensAt) {
    body = (
      <div data-closed style={{ borderRadius: 20, background: m.soft, padding: 16 }}>
        <CapsLabel as="p">Not open yet</CapsLabel>
        <h2 style={{ margin: "4px 0 0", fontSize: px(18), fontWeight: 800, color: m.ink }}>New professionals join through Hiring</h2>
        <p style={{ margin: "4px 0 0", fontSize: px(12.5), lineHeight: lh(18), color: m.ink2 }}>The free window to add your existing team hasn't started yet. Until it does, post an opening or send a direct offer. A one-time hiring fee applies to each hire.</p>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" onClick={() => navigate(`${HIRING_ROUTES.hub}?post=1`)} className="market-focus" style={{ height: 44, borderRadius: 12, background: m.fill, color: m.onfill, border: 0, fontSize: px(13), fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
            Post an opening
          </button>
          <button type="button" onClick={() => navigate(HIRING_ROUTES.find)} className="market-focus" style={{ height: 44, boxSizing: "content-box", padding: 0, borderRadius: 12, background: "transparent", border: `1px solid ${m.border}`, color: m.pdark, fontSize: px(13), fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
            Find a professional
          </button>
        </div>
      </div>
    );
  } else if (!isOpen) {
    const during = team.status === "ok" ? addedDuringWindow(team.value) : [];
    body = (
      <>
        <div data-closed style={{ borderRadius: 20, background: m.soft, padding: 16 }}>
          <CapsLabel as="p">{`Closed ${fullDate(w.closesAt)}`.trim()}</CapsLabel>
          <h2 style={{ margin: "4px 0 0", fontSize: px(18), fontWeight: 800, color: m.ink }}>New professionals join through Hiring</h2>
          <p style={{ margin: "4px 0 0", fontSize: px(12.5), lineHeight: lh(18), color: m.ink2 }}>Your free window to add your existing team has ended. Post an opening or send a direct offer. A one-time hiring fee applies to each hire.</p>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => navigate(`${HIRING_ROUTES.hub}?post=1`)} className="market-focus" style={{ height: 44, borderRadius: 12, background: m.fill, color: m.onfill, border: 0, fontSize: px(13), fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
              Post an opening
            </button>
            <button type="button" onClick={() => navigate(HIRING_ROUTES.find)} className="market-focus" style={{ height: 44, boxSizing: "content-box", padding: 0, borderRadius: 12, background: "transparent", border: `1px solid ${m.border}`, color: m.pdark, fontSize: px(13), fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>
              Find a professional
            </button>
          </div>
        </div>
        {during.length ? (
          <>
            <CapsLabel as="p" style={{ marginTop: 16 }}>{`Added during the window · ${during.length}`}</CapsLabel>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {during.map((t) => (
                <div key={t.professional.id} data-person style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 18, border: `1px solid ${m.border}`, padding: "10px 12px" }}>
                  <MarketAvatar id={t.professional.id} name={t.professional.name} photoUrl={t.professional.photoUrl} size={40} fontSize={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: px(13.5), fontWeight: 800, color: m.ink }}>{t.professional.name}</div>
                    <div style={{ fontSize: px(11.5), color: m.faint }}>{t.professional.specialty ? `${t.professional.specialty} · added free` : "Added free"}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </>
    );
  } else {
    const cd = countdownParts(w.daysLeft);
    const people = results.status === "ok" ? results.value : [];
    body = (
      <>
        <div data-countdown style={{ borderRadius: 20, background: fixedBg(tealHue, tealBg), padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: tealInk }}>Free for your first 30 days</span>
            {w.closesAt ? <span style={{ fontSize: px(11.5), fontWeight: 700, color: tealInk, whiteSpace: "nowrap" }}>{`Closes ${fullDate(w.closesAt)}`}</span> : null}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: px(34), fontWeight: 800, letterSpacing: "-0.02em", color: dark ? m.ink : "#17142A" }}>{cd.figure}</span>
            {cd.unit ? <span style={{ fontSize: px(14), fontWeight: 700, color: tealInk }}>{cd.unit}</span> : null}
          </div>
          <div
            role="progressbar"
            aria-label="Free window used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(windowUsed(w.daysLeft) * 100)}
            style={{ marginTop: 8, height: 6, borderRadius: 999, background: hexAlpha("#4F8F8A", 0.18), overflow: "hidden" }}
          >
            <div style={{ height: "100%", width: windowPct(windowUsed(w.daysLeft)), borderRadius: 999, background: tealLine }} />
          </div>
          <p style={{ margin: "10px 0 0", fontSize: px(12), lineHeight: lh(17), color: m.ink2 }}>
            Add the trainers, dietitians, physiotherapists and other professionals who already work with you. They join free and can teach your classes. After the window, new professionals join through Hiring.
          </p>
        </div>

        <label data-search style={{ marginTop: 12, height: 48, borderRadius: 14, border: `1.5px solid ${m.fill}`, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", boxSizing: "content-box", cursor: "text" }}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or specialty"
            aria-label="Search by name or specialty"
            className="et-search"
            style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: px(14), fontWeight: 600, color: m.ink, fontFamily: "inherit", padding: 0 }}
          />
          <style>{`.et-search::placeholder{color:${m.faint};opacity:1}`}</style>
        </label>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }} aria-live="polite">
          {results.status === "loading" ? (
            <MarketSkeleton radius={18} rows={1} height={66} count={2} gap={8} label="Searching" />
          ) : results.status === "error" ? (
            <MarketError thing="professionals" onRetry={retry} />
          ) : results.status === "pending" ? (
            <SoonNote style={{ marginTop: 0 }}>Hiring is coming soon.</SoonNote>
          ) : people.length === 0 ? (
            <SoonNote style={{ marginTop: 0 }}>No professionals found. Invite them by email or phone.</SoonNote>
          ) : (
            people.map((p) => {
              const src = sourceOf.get(p.id);
              const isAdded = added.has(p.id) || src === "existing_team";
              const onTeam = isAdded || src === "hire" || p.onTeam;
              const isPicked = picked.has(p.id);
              const hl = isPicked || isAdded;
              return (
                <div key={p.id} data-person style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 18, border: hl ? `1.5px solid ${tealLine}` : `1px solid ${m.border}`, background: m.card, padding: "10px 12px" }}>
                  <MarketAvatar id={p.id} name={p.name} photoUrl={p.photoUrl} size={44} fontSize={14} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: px(14), fontWeight: 800, color: m.ink }}>{p.name}</div>
                    {p.specialty ? <div style={{ fontSize: px(11.5), color: m.faint }}>{p.specialty}</div> : null}
                    {isAdded ? <ExistingTeamChip /> : null}
                  </div>
                  {!onTeam ? (
                    <button
                      type="button"
                      aria-pressed={isPicked}
                      aria-label={`${isPicked ? "Selected" : "Add free"}: ${p.name}`}
                      onClick={() => toggle(p)}
                      className="hit market-focus"
                      style={{
                        height: 34,
                        boxSizing: "content-box",
                        padding: "0 12px",
                        borderRadius: 11,
                        background: isPicked ? fixedBg(tealHue, tealBg) : m.card,
                        color: isPicked ? tealInk : m.pdark,
                        border: isPicked ? `1.5px solid ${tealLine}` : `1px solid ${m.border}`,
                        display: "flex",
                        alignItems: "center",
                        fontSize: px(12.5),
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        fontFamily: "inherit",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isPicked ? "Selected" : "Add free"}
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="market-focus"
          style={{ marginTop: 12, width: "100%", height: 50, borderRadius: 14, border: `1px solid ${m.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: px(14), fontWeight: 700, color: m.pdark, fontFamily: "inherit", cursor: "pointer" }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
          Invite by email or phone
        </button>
        <p style={{ margin: "10px 0 0", fontSize: px(11.5), lineHeight: lh(16), color: m.faint }}>
          {"Front desk and other non-professional staff join through "}
          <button
            type="button"
            onClick={() => navigate("/app/business/employees")}
            className="market-focus"
            style={{ display: "inline", padding: 0, border: 0, background: "transparent", font: "inherit", fontWeight: 700, color: m.pdark, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            More › Team and access
          </button>
          {", any time, free."}
        </p>
        {picked.size > 0 ? (
          <PrimaryButton onClick={() => {
              setDlgError(null);
              setConfirming(true);
            }} style={{ marginTop: 14, height: 52, fontWeight: 800 }}>
            {addCta(picked.size)}
          </PrimaryButton>
        ) : null}
      </>
    );
  }

  const chosen = [...picked.values()];
  return (
    <div style={{ color: m.ink, lineHeight: "normal", paddingBottom: 32 }}>
      <style>{FOCUS_CSS}</style>
      {header}
      {body}
      <CentredDialog
        open={confirming}
        width={338}
        pad="24px 22px 22px"
        actionsTop={18}
        tone="primary"
        title={addTitle(chosen.length)}
        body="They join as your existing team. They can be named as class instructors and their profiles show to clients."
        cancel="Back"
        action="Add free"
        busy={busy}
        error={dlgError}
        onCancel={() => !busy && setConfirming(false)}
        onAction={() => void addNow()}
      >
        <DialogRows rows={[...chosen.map((p): [string, string] => [p.name, p.specialty ?? ""]), ["Hiring fee", "None · existing team"]]} />
      </CentredDialog>
      {businessId && w ? (
        <InviteSheet
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          businessId={businessId}
          closesAt={w.closesAt}
          onSent={(name) => {
            setInviteOpen(false);
            showStrip(`Invite sent to ${name}`);
          }}
          onClosed={retry}
        />
      ) : null}
      {strip}
    </div>
  );
}

/** "Invite a professional" (etInvite): MasterSheet; Email or phone, Name, "They are a" chips, the note; Send invite. */
function InviteSheet({ open, onClose, businessId, closesAt, onSent, onClosed }: { open: boolean; onClose: () => void; businessId: string; closesAt: string | null; onSent: (name: string) => void; onClosed: () => void }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const online = useOnline();
  const ids = { contact: useId(), name: useId(), type: useId() };
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<ProfessionalType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    if (open) return;
    setContact("");
    setName("");
    setType(null);
    setBusy(false);
    setError(null);
    setSoon(false);
  }, [open]);

  const valid = isEmailOrPhone(contact) && !!name.trim() && !!type;
  const send = async () => {
    if (!valid || busy || !type) return;
    if (!online) return setError("You're offline. Try again when you're connected.");
    setBusy(true);
    setError(null);
    setSoon(false);
    const r = await inviteExistingTeam(businessId, { emailOrPhone: contact.trim(), name: name.trim(), professionalType: type });
    setBusy(false);
    if (r.ok) return onSent(name.trim());
    if (r.pending) return setSoon(true);
    setError(r.message);
    if (r.error === "window_closed") onClosed();
  };

  return (
    <MasterSheet open={open} onClose={() => !busy && onClose()} title="Invite a professional" footer={<PrimaryButton onClick={() => void send()} disabled={!valid} busy={busy}>Send invite</PrimaryButton>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, lineHeight: "normal" }}>
        <SheetBox label="Email or phone" htmlFor={ids.contact}>
          <input id={ids.contact} type="text" inputMode="email" autoComplete="off" value={contact} onChange={(e) => setContact(e.target.value)} disabled={busy} style={fieldStyle(m)} />
        </SheetBox>
        <SheetBox label="Name" htmlFor={ids.name}>
          <input id={ids.name} type="text" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} style={fieldStyle(m)} />
        </SheetBox>
        <div style={{ background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
          <p id={ids.type} style={{ margin: "0 0 8px", fontSize: px(13), fontWeight: 500, color: m.slabel }}>They are a</p>
          <div role="radiogroup" aria-labelledby={ids.type} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRO_TYPE_CHIPS.map((c) => (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={type === c.key}
                disabled={busy}
                onClick={() => setType(c.key)}
                className="hit market-focus"
                style={{ ...sheetChipStyle(type === c.key), padding: "8px 12px", fontSize: px(13), fontFamily: "inherit", lineHeight: "normal", cursor: "pointer" }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <SheetNote>{inviteNote(closesAt)}</SheetNote>
        {soon ? <SoonNote style={{ marginTop: 0 }}>Hiring is coming soon.</SoonNote> : null}
        {error ? <SaveError style={{ marginTop: 0 }}>{error}</SaveError> : null}
      </div>
    </MasterSheet>
  );
}

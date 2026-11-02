import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Paperclip } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { liftInk } from "../../../components/market/marketColor";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { TicketStub } from "../../../components/market/TicketStub";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { BackHeader } from "../listingParts";
import {
  decideApplication,
  fetchApplications,
  fetchMyOpenings,
  payMoney,
  sendHireOffer,
  type Application,
  type ApplicationStatus,
  type BusyTime,
  type Opening,
} from "../../../services/hiring";
import { HIRING_ROUTES } from "./HiringRoutes";
import { useHiringBusiness } from "./useHiringBusiness";
import { BusyWarning, HiredLine, HiringEmpty, InboxGlyph, PersonHead, TagChip, useHiringRead, useHiringStrip } from "./hiringParts";
import HireConfirmDialog, { type DialogNote, type HireOffer } from "./HireConfirmDialog";
import { applicantTag, busyText, firstName, hiredState, hiredStrip, offerStartDate, scheduleLine, sentStrip, typeLabel } from "./hubModel";
import { t, tn, tx } from "../../../i18n/core";

// Market + Share 3.0 · W4 · B-MA.8.2 Applicants (`appList`, `appEmpty`) and
// the B-MA.8.3 hire states (`hireConfirm`, `hireConfirmMin`, `hireDone`),
// Business Hiring Screens markup lines 104–131, padding 0 16 32:
//   the opening ticket: TicketStub (radius 18, --card, 0.5px --hair) body
//     padding 12 14: caps type 10.5 / 700 0.1em --faint, title 15 / 800
//     margin-top 2, schedule 12 --ink2 margin-top 2; the 72 stub (--pale,
//     1.5px dashed --fill): pay 18 / 800 --pdark over its unit 10 / 700;
//   caps "N applicants" (margin-top 16);
//   applicant cards (margin-top 8, gap 10): radius 20, --card, 1px --border
//     (1.5px #4F8F8A once HIRED), padding 14 16; the person row with the tag;
//     the hired line (margin-top 8); the message (margin-top 10, radius 12,
//     --soft, padding 10 12, 12.5 / 18 --ink2); attachment chips (margin-top
//     8, gap 6; padding 4 9, radius 999, --pale / --pdark 11 / 700, the 11
//     paperclip); actions (margin-top 12, gap 8): Shortlist (flex 1, 40 + its
//     1px --border = 42, radius 12, --pdark 13 / 800; "Shortlisted" once done),
//     Offer (flex 1, --fill / --onfill 13 / 800), Decline (auto, padding
//     0 10, --ink2 13 / 700); HIRED shows "Hired · starts {date} · on your
//     Team" 12 / 700 --tealink instead (margin-top 12);
//   empty: "No applicants yet", the direct-offer line, "Find a professional".
// Offer opens HireConfirmDialog; after the professional accepts (the
// application reads HIRED, a server state) the strip "Hired · one-time fee
// $X added to your Centium bill" shows once, with Fees for the owner.
//
// Ours: an OFFERED card reads "Offer sent · waiting for {first}" and a
// DECLINED one "Declined" in place of the actions; busy times returned with
// an offer show as a caution card under that applicant (a warning, never
// blocking). Database Release 2: opening_applicants (the cards, with
// professional_rating()), decide_application, send_hire_offer (+ busy times
// from check_conflicts), and the hired card's fee from my_hiring_fees (the
// charged amount; the quote the gym was shown when the caller can't read
// fees).

const stubOf = (o: Opening): { n: string; unit: string } | null => {
  if (o.pay == null || o.pay <= 0) return null;
  return { n: payMoney(o.pay), unit: o.payUnit === "per_class" ? "per class" : o.payUnit === "per_month" ? "a month" : "for the slot" };
};

const SEEN = "hiring-hired-seen:";
const seen = (id: string): boolean => {
  try {
    return localStorage.getItem(SEEN + id) === "1";
  } catch {
    return true;
  }
};
const markSeen = (id: string) => {
  try {
    localStorage.setItem(SEEN + id, "1");
  } catch {
    /* private mode: the strip may show again */
  }
};

export default function ApplicantsPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack(HIRING_ROUTES.hub);
  const { openingId = "" } = useParams();
  const passed = (useLocation().state as { opening?: Opening } | null)?.opening;
  const biz = useHiringBusiness();
  const id = biz.canHire ? biz.businessId : null;
  const [strip, showStrip] = useHiringStrip();

  // The opening: handed over by the hub, else found in my_openings.
  const lookup = useHiringRead(() => (passed && passed.id === openingId ? null : id ? fetchMyOpenings(id, null) : null), [id, openingId, passed]);
  const opening: Opening | null = passed && passed.id === openingId ? passed : (lookup.value?.find((o) => o.id === openingId) ?? null);

  const apps = useHiringRead(() => (openingId && id ? fetchApplications(id, openingId) : null), [id, openingId]);
  const [changed, setChanged] = useState<Record<string, { status?: ApplicationStatus; busy?: BusyTime[] }>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [offer, setOffer] = useState<{ app: Application; o: HireOffer } | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<DialogNote | null>(null);

  const list = useMemo(() => {
    const rows = (apps.value ?? []).map((a) => ({ ...a, status: changed[a.id]?.status ?? a.status }));
    return [...rows.filter((a) => a.status !== "DECLINED"), ...rows.filter((a) => a.status === "DECLINED")];
  }, [apps.value, changed]);

  // The hire strip, once per hire on this device: the professional accepted (HIRED is the server's state).
  useEffect(() => {
    if (!opening) return;
    const hired = (apps.value ?? []).find((a) => a.status === "HIRED" && !seen(a.id));
    if (!hired) return;
    markSeen(hired.id);
    if (hired.fee == null) return;
    showStrip(hiredStrip(hired.fee), biz.isOwner ? { action: t("Fees"), onAction: () => navigate(HIRING_ROUTES.fees) } : {});
  }, [apps.value, opening, biz.isOwner, navigate, showStrip]);

  const act = async (a: Application, kind: "shortlist" | "decline") => {
    if (working) return;
    setWorking(a.id);
    const r = await decideApplication(a.id, kind === "shortlist" ? "shortlisted" : "declined");
    setWorking(null);
    if (r.ok) setChanged((c) => ({ ...c, [a.id]: { ...c[a.id], status: kind === "shortlist" ? "SHORTLISTED" : "DECLINED" } }));
    else showStrip(r.message, { tone: r.pending ? "neutral" : "error" });
  };

  const openOffer = (a: Application) => {
    if (!opening || opening.pay == null) return;
    setNote(null);
    setOffer({
      app: a,
      o: {
        name: a.professional.name,
        onTeam: a.professional.onTeam,
        type: opening.type,
        title: opening.title,
        pay: opening.allowPayProposals && a.proposedPay ? a.proposedPay : opening.pay,
        payUnit: opening.payUnit,
        classesPerMonth: opening.classesPerMonth,
        startsOn: offerStartDate(opening),
      },
    });
  };

  const send = async () => {
    if (!offer || !opening || !id || sending) return;
    setSending(true);
    const r = await sendHireOffer(id, {
      professionalId: offer.app.professional.id,
      applicationId: offer.app.id,
      type: offer.o.type,
      title: offer.o.title,
      classSeriesIds: opening.classSeriesIds,
      classSessionId: opening.classSessionId,
      pay: offer.o.pay,
      payUnit: offer.o.payUnit,
      classesPerMonth: offer.o.classesPerMonth,
      startsOn: offer.o.startsOn,
      message: null,
    });
    setSending(false);
    if (!r.ok) {
      setNote({ text: r.message, tone: r.pending ? "soon" : "error" });
      return;
    }
    const appId = offer.app.id;
    setChanged((c) => ({ ...c, [appId]: { status: "OFFERED", busy: r.value.conflicts } }));
    showStrip(sentStrip(offer.app.professional.name));
    setOffer(null);
  };

  const stub = opening ? stubOf(opening) : null;
  const sched = opening ? scheduleLine(opening) : "";
  const loadingOpening = !opening && lookup.state === "loading" && !passed;
  const empty = (apps.state === "ok" || apps.state === "pending") && list.length === 0;
  const hiredBorder = dark ? liftInk("#4F8F8A") : "#4F8F8A";

  return (
    <div style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow={t("Hiring")} title={t("Applicants")} onBack={back} backLabel={t("Back to Hiring")} />
      {strip}

      {opening ? (
        <TicketStub
          stubWidth={72}
          tone="pale"
          radius={18}
          ariaLabel={[typeLabel(opening.type), opening.title, sched, stub ? `${stub.n} ${stub.unit}` : ""].filter(Boolean).join(", ")}
          stub={
            stub ? (
              <span aria-hidden style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: textPx(18), fontWeight: 800, color: m.pdark }}>{stub.n}</span>
                <span style={{ fontSize: textPx(10), fontWeight: 700, color: m.pdark }}>{stub.unit}</span>
              </span>
            ) : undefined
          }
        >
          <div aria-hidden style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>{typeLabel(opening.type)}</div>
            <div style={{ fontSize: textPx(15), fontWeight: 800, marginTop: 2, overflowWrap: "anywhere" }}>{opening.title}</div>
            {sched ? <div style={{ fontSize: textPx(12), color: m.ink2, marginTop: 2 }}>{sched}</div> : null}
          </div>
        </TicketStub>
      ) : loadingOpening ? (
        <MarketSkeleton radius={18} rows={3} label={t("Loading the opening")} />
      ) : null}

      {apps.state === "loading" && !apps.value ? <MarketSkeleton radius={20} rows={4} count={2} label={t("Loading the applicants")} style={{ marginTop: 16 }} /> : null}
      {apps.state === "error" ? <MarketError thing="the applicants" onRetry={apps.retry} style={{ marginTop: 16 }} /> : null}
      {apps.state === "offline" ? <MarketOffline loaded={list.length > 0} onRetry={apps.retry} force style={{ marginTop: 16 }} /> : null}

      {apps.state === "ok" || apps.state === "pending" || list.length ? (
        <div data-apl-count style={{ marginTop: 16, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
          {list.length ? tn(list.length, "{n} applicant", "{n} applicants") : t("No applicants")}
        </div>
      ) : null}

      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((a) => {
          const tag = applicantTag(a);
          const hired = a.status === "HIRED";
          const canAct = a.status === "APPLIED" || a.status === "SHORTLISTED";
          const busy = changed[a.id]?.busy ?? [];
          const state =
            a.status === "HIRED"
              ? { text: hiredState(a.hireStartsOn), ink: m.tealink }
              : a.status === "OFFERED"
                ? { text: t("Offer sent · waiting for {name}", { name: firstName(a.professional.name) }), ink: m.ink2 }
                : a.status === "DECLINED"
                  ? { text: t("Declined"), ink: m.faint }
                  : null;
          return (
            <div key={a.id} data-applicant={a.id} style={{ borderRadius: 20, background: m.card, border: hired ? `1.5px solid ${hiredBorder}` : `1px solid ${m.border}`, padding: "14px 16px" }}>
              <PersonHead p={a.professional} trailing={<TagChip tag={tag} />} />
              <HiredLine roles={a.professional.hiredViaCentiumCount} style={{ marginTop: 8 }} />
              {a.message ? <div style={{ marginTop: 10, borderRadius: 12, background: m.soft, padding: "10px 12px", fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2, overflowWrap: "anywhere" }}>{a.message}</div> : null}
              {a.attachments.length ? (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {a.attachments.map((att, i) => (
                    <span key={`${att.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 999, background: m.pale, color: m.pdark, fontSize: textPx(11), fontWeight: 700 }}>
                      <Paperclip size={11} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
                      {att.label}
                    </span>
                  ))}
                </div>
              ) : null}
              {canAct ? (
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => a.status === "APPLIED" && void act(a, "shortlist")}
                    aria-pressed={a.status === "SHORTLISTED"}
                    aria-disabled={a.status === "SHORTLISTED" || working === a.id || undefined}
                    className="hit market-focus"
                    style={{ flex: 1, height: 42, borderRadius: 12, border: `1px solid ${m.border}`, background: "transparent", color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(13), fontWeight: 800, fontFamily: "inherit", cursor: a.status === "APPLIED" ? "pointer" : "default", boxSizing: "border-box" }}
                  >
                    {a.status === "SHORTLISTED" ? t("Shortlisted") : t("Shortlist")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openOffer(a)}
                    disabled={!opening || opening.pay == null}
                    className="hit market-focus"
                    style={{ flex: 1, height: 40, borderRadius: 12, border: 0, background: m.fill, color: m.onfill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(13), fontWeight: 800, fontFamily: "inherit", cursor: "pointer", opacity: !opening || opening.pay == null ? 0.4 : 1 }}
                  >
                    {tx("Offer", "hire")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(a, "decline")}
                    aria-disabled={working === a.id || undefined}
                    className="hit market-focus"
                    style={{ flex: "0 0 auto", height: 40, padding: "0 10px", color: m.ink2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(13), fontWeight: 700, border: 0, background: "transparent", fontFamily: "inherit", cursor: "pointer" }}
                  >
                    {t("Decline")}
                  </button>
                </div>
              ) : null}
              {state ? <div style={{ marginTop: 12, fontSize: textPx(12), fontWeight: 700, color: state.ink }}>{state.text}</div> : null}
              {busy.length ? <BusyWarning lines={busy.map(busyText).filter(Boolean)} style={{ marginTop: 10 }} /> : null}
            </div>
          );
        })}
      </div>

      {empty ? (
        <HiringEmpty
          icon={<InboxGlyph />}
          title={t("No applicants yet")}
          body={t("Professionals who apply show here. If you already know someone, send them a direct offer.")}
          action={t("Find a professional")}
          onAction={() => navigate(HIRING_ROUTES.find)}
        />
      ) : null}

      <HireConfirmDialog
        offer={offer?.o ?? null}
        direct={false}
        busy={sending}
        note={note}
        onCancel={() => {
          if (!sending) setOffer(null);
        }}
        onSend={() => void send()}
      />
    </div>
  );
}

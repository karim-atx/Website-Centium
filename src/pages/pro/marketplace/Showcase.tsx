import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { SegmentedTicketStrip } from "../../../components/market/SegmentedTicketStrip";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { useMyCv } from "../../../components/cv/useMyCv";
import { averageOf, reviewerLabel } from "../../../components/pro/profile/profileModel";
import { typeLabel } from "../../../components/pro/profile/typeLabel";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { useReviewsAboutMe } from "../../../hooks/useProfessionalReviews";
import { deleteSessionType, fetchAvailability, fetchBookingPolicy, DEFAULT_POLICY, type AvailabilityRow, type BookingAudience } from "../../../services/pro/calendar";
import { fetchMyProfile, type ProfessionalProfile } from "../../../services/professional-profile";
import {
  aboutRows,
  deletePlanService,
  deleteShelfItem,
  fetchShelf,
  fetchShowcaseServices,
  initials,
  ratingLine,
  serviceCards,
  servicesHeader,
  setServiceVisible,
  setShelfItemVisible,
  weeklyHours,
  withoutPending,
  type PlanService,
  type ServiceCard,
  type ServiceRef,
  type SessionService,
  type ShelfItem,
} from "../../../services/pro-market";
import { marketPalette } from "../../../theme/marketTokens";
import { formatShortDate } from "../../../utils/date";
import { range12 } from "../../../utils/time12";
import { CapsLabel, CentredDialog, OutlineButton, SheetSwitch, lh, px, useMarketColors, useStrip } from "../../business-market/listingParts";
import { MarketplaceEmpty, Stars } from "./showcaseParts";
import { workCountLine, workMetaLine } from "./showcaseWork";
import { TicketStub, type StubTone } from "../../../components/market/TicketStub";
import { TicketCheck } from "../../../components/market/ProfessionalCard";
import { initialsOf } from "../../../components/market/peopleModel";
import { stubColors } from "../../../components/market/marketColor";
import { fetchOpenToGymWork, setOpenToGymWork } from "../../../services/team-hiring";
import { fetchWorkHistory, sortWork, workRoleLine, workStub, type WorkEntry } from "../../../services/pro-profile";
import { ServiceEditSheet } from "./ServiceEditSheet";

// Market + Share 3.0 · W3 · P-MA.2 Showcase (HANDOVER §4 "P-MA.2 Showcase";
// Professional Marketplace Screens lines 112–226 and the `scSegs`, `sc`,
// `svc`, `empty`, `aboutRows`, `avail`, `strip`, `sheet`, `dlg` script;
// frame-check P-MA.2, 11 frames). Padding 0 16 32 (the app column gives the
// 16):
// - the note (radius 16, --pale, padding 12 14, 12.5 / 18 700 --pdark);
// - SegmentedTicketStrip (W1, "tab") About · Services · Availability · Work
//   history, steps 1–4, margin-top 12;
// - About (scAbout): the LIVE public profile (avatar, first name, headline or
//   type, rating · reviews · area; bio; specialties; credentials, languages
//   and the contact line, D-27), read only with "Edit profile" →
//   /app/more/edit-profile. "Hired via Centium" is DB10 (Release 2): not drawn;
// - Services (scServices / scServicesEmpty / scDeleted): the professional's
//   own shelf (business_offerings with professional_id, Database 73ea87b:
//   what members see through public_showcase, in its order) first, then the
//   LIVE appointment_services (Book) and professional_plans (Hire) (D-18), as
//   cards with the kebab (Edit · Hide / Show · Delete); Edit / Add → the Edit
//   service sheet (ServiceEditSheet; adding a "Showcase item" writes a shelf
//   row); Delete → "Delete this service?" → "Confirm delete" → the delete is
//   written at once and the strip reads "Service deleted" (lead decision: no
//   deferred Undo, as the dialog says "This can't be undone"). Hide / Show on
//   a shelf item writes its `visible` (drawn at 0.5 with "Hidden"; an item
//   Centium took down reads "Hidden by Centium" and can't be shown again);
//   Hide / Show on a session type or plan writes its DB3 `visible`
//   (Database PR #39: drawn at 0.5 with "Hidden"). A plan not offered is
//   drawn at 0.5 with "Not offered" (its live state, which wins the chip);
// - Availability (scAvailability): the LIVE weekly hours (own practice rows of
//   instructor_availability, 12-hour), "Open to gym work" (DB11, Release 2:
//   shown off and disabled with a note), "Edit hours" →
//   /app/pro/calendar/availability;
// - Work history (scWork / scWorkEmpty; W5): professional_public_profile
//   (DB10, awaiting) gives the Centium work-history entries and the
//   class-context reviews; while it is pending, the drawn empty state with
//   the LIVE reviews block (professional_reviews about me) below it.

type Section = "about" | "services" | "availability" | "work";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "availability", label: "Availability" },
  { key: "work", label: "Work history" },
];

export function ShowcaseTab() {
  const c = useMarketColors();
  const [section, setSection] = useState<Section>("about");
  return (
    <div style={{ paddingBottom: 32, color: c.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ borderRadius: 16, background: c.pale, padding: "12px 14px", fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: c.pdark }}>
        This is your public Showcase. Phone, email and social links are never shown. Clients and gyms reach you in Messages.
      </div>
      <SegmentedTicketStrip items={SECTIONS} active={section} onChange={setSection} label="Showcase" idPrefix="pm-sc" style={{ marginTop: 12 }} />
      <div role="tabpanel" id={`pm-sc-panel-${section}`} aria-labelledby={`pm-sc-tab-${section}`}>
        {section === "about" && <AboutPanel />}
        {section === "services" && <ServicesPanel />}
        {section === "availability" && <AvailabilityPanel />}
        {section === "work" && <WorkPanel />}
      </div>
    </div>
  );
}

/** The "Edit hours" / "Edit profile" button (line 179): 48 tall, radius 14, 1px --border, 14 / 700 --pdark. */
function WideButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const c = useMarketColors();
  return (
    <button
      type="button"
      onClick={onClick}
      className="market-focus"
      style={{ marginTop: 12, width: "100%", minHeight: 48, borderRadius: 14, border: `1px solid ${c.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(14), fontWeight: 700, color: c.pdark, fontFamily: "inherit", cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// About (lines 121–146)

function AboutPanel() {
  const dark = useIsDark();
  const c = marketPalette(dark);
  const navigate = useNavigate();
  const { user, authUserId } = useApp();
  const { cv, error: cvError, reload: reloadCv } = useMyCv();
  const { reviews } = useReviewsAboutMe();
  const { facts } = useProfileFacts();
  const [own, setOwn] = useState<{ value: ProfessionalProfile | null } | "error" | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    void fetchMyProfile(authUserId).then((r) => alive && setOwn(r.ok ? { value: r.profile } : "error"));
    return () => {
      alive = false;
    };
  }, [authUserId, tick]);

  if (own === "error" || (cvError && !cv)) {
    return (
      <MarketError
        thing="your profile"
        onRetry={() => {
          setOwn(null);
          setTick((t) => t + 1);
          void reloadCv();
        }}
        style={{ marginTop: 14 }}
      />
    );
  }
  if (!own || !cv) return <MarketSkeleton radius={24} rows={3} height={128} label="Loading your profile" style={{ marginTop: 14 }} />;

  const p = own.value;
  const shown = reviews.filter((r) => !r.redactedAt);
  const rating = ratingLine(averageOf(reviews), shown.length, p?.location ?? null);
  const name = (user.firstName ?? "").trim();
  const subtitle = cv.profile.headline?.trim() || p?.specialty?.trim() || typeLabel(user.professionalSubtype);
  const nowMonth = new Date().toISOString().slice(0, 7);
  const rows = aboutRows(cv.licences, cv.reviews, cv.languages.map((l) => l.language), nowMonth);
  const specialties = facts?.specialties ?? [];
  const bio = p?.bio?.trim() || null;
  const caps = (t: string) => <CapsLabel style={{ marginTop: 18 }}>{t}</CapsLabel>;

  return (
    <>
      <div style={{ marginTop: 14, borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, padding: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span
            aria-hidden
            style={{ width: 64, height: 64, borderRadius: 999, background: dark ? c.pale : "#EEEAF8", color: dark ? c.accent : "#7D67D9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(20), fontWeight: 800, flexShrink: 0, overflow: "hidden" }}
          >
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials(name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: px(18), fontWeight: 800, lineHeight: lh(24), margin: 0 }}>{name || "Your name"}</h2>
            <div style={{ fontSize: px(12.5), color: c.ink2 }}>{subtitle}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: px(11.5), color: c.faint, marginTop: 2 }}>
              {rating.star ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill={c.gold} stroke={c.gold} strokeWidth="1.5" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, transform: "none" }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ) : null}
              <span>{rating.text}</span>
            </div>
          </div>
        </div>
      </div>
      {caps("About")}
      <p style={{ marginTop: 6, fontSize: px(13), lineHeight: lh(19.5), color: bio ? c.ink2 : c.faint, marginBottom: 0 }}>{bio ?? "Add a short bio so clients and gyms know how you work."}</p>
      {specialties.length ? (
        <>
          {caps("Specialties")}
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {specialties.map((s) => (
              <span key={s} style={{ padding: "5px 10px", borderRadius: 999, background: c.pale, color: c.pdark, fontSize: px(11.5), fontWeight: 700 }}>
                {s}
              </span>
            ))}
          </div>
        </>
      ) : null}
      <div style={{ marginTop: 18, borderRadius: 20, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={`${r.title}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? `0.5px solid ${c.div}` : 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: px(13.5), fontWeight: 700 }}>{r.title}</div>
              <div style={{ fontSize: px(11.5), color: c.faint }}>{r.sub}</div>
            </div>
            {r.value ? <span style={{ fontSize: px(11.5), fontWeight: 700, color: r.tone === "good" ? c.good : c.faint, flexShrink: 0 }}>{r.value}</span> : null}
          </div>
        ))}
      </div>
      <WideButton onClick={() => navigate("/app/more/edit-profile")}>Edit profile</WideButton>
    </>
  );
}

// ---------------------------------------------------------------------------
// Services (lines 148–163, the sheet 551–576, the dialogs 600–615)

type Loaded = { status: "loading" } | { status: "error"; offline: boolean } | { status: "ok"; sessions: SessionService[]; plans: PlanService[]; shelf: ShelfItem[] };

function ServicesPanel() {
  const navigate = useNavigate();
  const online = useOnline();
  const { authUserId } = useApp();
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [audience, setAudience] = useState<BookingAudience>(DEFAULT_POLICY.whoCanBook);
  const [sheet, setSheet] = useState<{ target: ServiceRef | null } | null>(null);
  const [del, setDel] = useState<{ ref: ServiceRef; step: 1 | 2 } | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [strip, showStrip] = useStrip();
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    void Promise.all([fetchShowcaseServices(authUserId), fetchShelf(authUserId)]).then(([r, sh]) => {
      if (!alive) return;
      if (!r.ok) return setState({ status: "error", offline: r.offline });
      if (!sh.ok) return setState({ status: "error", offline: sh.offline });
      setState({ status: "ok", sessions: r.data.sessions, plans: r.data.plans, shelf: sh.data });
    });
    void fetchBookingPolicy(authUserId).then((r) => alive && r.ok && setAudience(r.data.whoCanBook));
    return () => {
      alive = false;
    };
  }, [authUserId, tick]);

  // Lead decision (R1 polish): the delete is written at once, matching the
  // dialog's "This can't be undone" (no deferred Undo). The card leaves while
  // the write runs; a failed write brings it back with the error strip.
  const confirmDelete = async (ref: ServiceRef) => {
    if (!authUserId) return;
    const key = `${ref.kind}:${ref.item.id}`;
    setDel(null);
    setSheet(null);
    setPending((s) => new Set(s).add(key));
    const r =
      ref.kind === "session" ? await deleteSessionType(authUserId, ref.item.id) : ref.kind === "shelf" ? await deleteShelfItem(authUserId, ref.item.id) : await deletePlanService(ref.item.id);
    setPending((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    if (r.ok) {
      showStrip("Service deleted");
      reload();
    } else showStrip(r.message, "error");
  };

  const hide = async (ref: ServiceRef) => {
    if (ref.kind === "shelf") {
      if (!authUserId || ref.item.hiddenByCentium) return;
      const show = !ref.item.visible;
      const r = await setShelfItemVisible(authUserId, ref.item.id, show);
      if (!r.ok) return showStrip(r.message, "error");
      showStrip(show ? "Service shown" : "Service hidden");
      return reload();
    }
    if (!authUserId) return;
    const show = !ref.item.visible;
    const r = await setServiceVisible(authUserId, ref.kind, ref.item.id, show);
    if (!r.ok) return showStrip(r.message, "error");
    showStrip(show ? "Service shown" : "Service hidden");
    reload();
  };

  let body: React.ReactNode;
  if (state.status === "loading") {
    body = <MarketSkeleton radius={20} rows={3} count={3} height={91} label="Loading your services" style={{ marginTop: 14 }} />;
  } else if (state.status === "error") {
    body = <MarketError thing="your services" onRetry={reload} style={{ marginTop: 14 }} />;
  } else {
    const cards = withoutPending(serviceCards(state.sessions, state.plans, state.shelf), pending);
    body = cards.length ? (
      <>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <CapsLabel>{servicesHeader(cards.length)}</CapsLabel>
          <OutlineButton onClick={() => setSheet({ target: null })} disabled={!online}>
            <Plus size={15} strokeWidth={2.4} aria-hidden style={{ transform: "none" }} />
            Add service
          </OutlineButton>
        </div>
        <ul style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, marginBottom: 0 }} aria-label="Services">
          {cards.map((card) => (
            <ServiceCardRow
              key={card.key}
              card={card}
              editing={!!sheet?.target && `${sheet.target.kind}:${sheet.target.item.id}` === card.key}
              canEdit={online}
              onEdit={() => setSheet({ target: card.ref })}
              onHide={() => void hide(card.ref)}
              onDelete={() => setDel({ ref: card.ref, step: 1 })}
            />
          ))}
        </ul>
      </>
    ) : (
      <MarketplaceEmpty title="No services yet" body="Add the sessions and packages clients can book. They show on your public profile." cta="Add service" onCta={() => setSheet({ target: null })} ctaDisabled={!online} />
    );
  }

  return (
    <>
      <MarketOffline loaded={state.status === "ok"} onRetry={reload} style={{ marginTop: 14 }} />
      {body}
      {state.status === "ok" ? (
        <ServiceEditSheet
          open={!!sheet}
          target={sheet?.target ?? null}
          plans={state.plans}
          shelf={state.shelf}
          audience={audience}
          onClose={() => setSheet(null)}
          onSaved={(msg) => {
            setSheet(null);
            showStrip(msg);
            reload();
          }}
          onDelete={(ref) => {
            setSheet(null);
            setDel({ ref, step: 1 });
          }}
          onOpenAvailability={() => navigate("/app/pro/calendar/availability")}
        />
      ) : null}
      <CentredDialog
        open={!!del}
        width={330}
        title={del?.step === 2 ? "Confirm delete" : "Delete this service?"}
        body={del?.step === 2 ? "This can't be undone." : "Clients who already booked it keep their sessions."}
        cancel="Cancel"
        action={del?.step === 2 ? "Delete service" : "Delete"}
        onAction={() => (del?.step === 1 ? setDel({ ref: del.ref, step: 2 }) : del && void confirmDelete(del.ref))}
        onCancel={() => setDel(null)}
      />
      {strip}
    </>
  );
}

/** A service card (lines 154–161): radius 20, --card, 1px --border (1.5px --fill while its sheet is open), padding 14 16. */
function ServiceCardRow({ card, editing, canEdit, onEdit, onHide, onDelete }: { card: ServiceCard; editing: boolean; canEdit: boolean; onEdit: () => void; onHide: () => void; onDelete: () => void }) {
  const c = useMarketColors();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const menu = !!anchor;
  const op = card.dim ? 0.5 : 1;
  const hidden = !card.ref.item.visible;
  const takenDown = card.ref.kind === "shelf" && card.ref.item.hiddenByCentium;
  return (
    <li style={{ borderRadius: 20, background: c.card, border: editing ? `1.5px solid ${c.fill}` : `1px solid ${c.border}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ flex: 1, minWidth: 0, fontSize: px(14), fontWeight: 800, margin: 0, opacity: op }}>{card.name}</h3>
        <span style={{ fontSize: px(14), fontWeight: 800, opacity: op }}>{card.price}</span>
        <button
          type="button"
          aria-label={`${card.name} options`}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={(e) => setAnchor(e.currentTarget)}
          className="hit market-focus"
          style={{ width: 32, height: 32, margin: "-6px -8px -6px 0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: c.ink2, background: "transparent", border: 0, padding: 0, cursor: "pointer", opacity: op, flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden style={{ transform: "none" }}>
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
      {card.meta ? <div style={{ fontSize: px(11.5), color: c.faint, marginTop: 2, opacity: op }}>{card.meta}</div> : null}
      {card.description ? <div style={{ fontSize: px(12.5), lineHeight: lh(18), color: c.ink2, marginTop: 6, opacity: op }}>{card.description}</div> : null}
      {card.chip ? (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: px(10.5), fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: c.soft, color: c.faint }}>{card.chip}</span>
        </div>
      ) : null}
      <PopupMenu
        open={menu}
        onClose={() => setAnchor(null)}
        anchor={anchor}
        align="right"
        options={[
          { value: "edit", label: "Edit", disabled: !canEdit },
          // A hidden service reads "Show"; a shelf item Centium took down can't be shown again.
          { value: "hide", label: hidden ? "Show" : "Hide", disabled: !canEdit || takenDown },
          { value: "delete", label: "Delete", destructive: true, disabled: !canEdit },
        ]}
        onSelect={(v) => {
          setAnchor(null);
          if (v === "edit") onEdit();
          else if (v === "hide") onHide();
          else onDelete();
        }}
      />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Availability (lines 165–180)

function AvailabilityPanel() {
  const c = useMarketColors();
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [rows, setRows] = useState<AvailabilityRow[] | "error" | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    void fetchAvailability(authUserId).then((r) => alive && setRows(r.ok ? r.data : "error"));
    return () => {
      alive = false;
    };
  }, [authUserId, tick]);

  let hours: React.ReactNode;
  if (rows === "error") {
    hours = (
      <MarketError
        thing="your hours"
        onRetry={() => {
          setRows(null);
          setTick((t) => t + 1);
        }}
        style={{ marginTop: 8 }}
      />
    );
  } else if (!rows) {
    hours = <MarketSkeleton radius={20} rows={4} height={300} label="Loading your hours" style={{ marginTop: 8 }} />;
  } else {
    const week = weeklyHours(rows, (a, b) => range12(a, b, "–"));
    hours = (
      <div style={{ marginTop: 8, borderRadius: 20, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        {week.map((d, i) => (
          <div key={d.day} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? `0.5px solid ${c.div}` : 0 }}>
            <span style={{ width: 44, fontSize: px(13), fontWeight: 800, flexShrink: 0 }}>{d.day}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: px(13), color: d.off ? c.faint : c.ink, fontWeight: 600 }}>{d.hours}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <CapsLabel style={{ marginTop: 14 }}>Weekly hours</CapsLabel>
      {hours}
      <GymWorkRow />
      <WideButton onClick={() => navigate("/app/pro/calendar/availability")}>Edit hours</WideButton>
    </>
  );
}

// ---------------------------------------------------------------------------
// Work history (lines 182–225, `workList`, `reviews`; W5)
//
// work_history(my id) (Database Release 2): with entries, the head
// row (margin-top 14, space-between: caps "Hired via Centium" 10.5 / 700
// 0.1em --faint; "2 roles · 1 class slot" 11.5 / 700 --tealink), the
// ticket-stub entries (margin-top 8, gap 10; TicketStub 46, min 96; the body
// padding 12 14, gap 12, top aligned: the 44 tile radius 12 --pale with the
// gym's initials 12.5 / 800 --accent; the gym 12 / 600 --accent; "{role} ·
// Role" 14 / 19 700; the dates 11.5 --faint (margin-top 1); "Hired via
// Centium" 11 / 700 --tealink with the ticket-check 12, gap 4, margin-top 5;
// the stub ROLE step 4 #E6F1EF / #4F8F8A, CLASS SLOT #EEEAF8 / #7D67D9 with
// #AEA1DC dashes, ENDED --soft / --faint / --border), then the reviews block
// (caps "Reviews · N" margin-top 18; the card margin-top 8 radius 20 1px
// --border: 30 / 34 800 average, the 13 stars, "From clients who attended
// your classes" 11.5 --faint; rows padding 12 16 with a 0.5 --div rule: name
// 12.5 / 800, date --faint, "{class} · {gym}" 11.5 / 600 --accent
// (margin-top 1), the text 12.5 / 18 --ink2 (margin-top 4)). No entries: the
// drawn empty state (scWorkEmpty). The reviews block is the live reviews about
// me (useReviewsAboutMe): the contract has no reader of class reviews with
// their class and gym (Database gap).

type WorkLoad = { ok: true; value: WorkEntry[] } | { ok: false; pending?: boolean; offline?: boolean } | null;

/**
 * P-MA.2 "Open to gym work": professional_profiles.open_to_gym_work (own row)
 * and set_gym_work_available(p_open) (Database Release 2). On: gyms find
 * them in search_professionals and may send direct offers; off stops both
 * (pending offers stay). The switch moves at once and comes back with a strip
 * when the save fails.
 */
function GymWorkRow() {
  const c = useMarketColors();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [strip, showStrip] = useStrip();
  useEffect(() => {
    let alive = true;
    void fetchOpenToGymWork().then((r) => alive && setOn(r.ok ? r.value : null));
    return () => {
      alive = false;
    };
  }, []);
  const change = async (v: boolean) => {
    if (busy || on === null) return;
    setBusy(true);
    setOn(v);
    const r = await setOpenToGymWork(v);
    setBusy(false);
    if (r.ok) setOn(r.value);
    else {
      setOn(!v);
      showStrip(r.message, "error");
    }
  };
  return (
    <>
      {strip}
      <div style={{ marginTop: 12, borderRadius: 16, border: `1px solid ${c.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: px(14), fontWeight: 700 }}>Open to gym work</div>
          <div id="pm-gymwork-sub" style={{ fontSize: px(11.5), lineHeight: lh(16), color: c.faint }}>
            Gyms can find you in search and send you direct offers.
          </div>
        </div>
        <SheetSwitch on={!!on} onChange={(v) => void change(v)} label="Open to gym work" describedBy="pm-gymwork-sub" disabled={on === null || busy} />
      </div>
    </>
  );
}

function WorkPanel() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const [load, setLoad] = useState<WorkLoad>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    setLoad(null);
    void fetchWorkHistory(authUserId).then((r) => alive && setLoad(r.ok ? { ok: true, value: r.value } : { ok: false, pending: r.pending, offline: r.offline }));
    return () => {
      alive = false;
    };
  }, [authUserId, tick]);
  const empty = (
    <MarketplaceEmpty
      title="No Centium work yet"
      body="Roles and class slots you're hired for through Opportunities show here with the gym's name. Reviews from class clients follow."
      cta="Browse opportunities"
      onCta={() => navigate("/app/pro/marketplace/opportunities")}
    />
  );
  if (load === null) return <MarketSkeleton radius={18} rows={4} height={100} count={2} label="Loading your work history" style={{ marginTop: 14 }} />;
  if (!load.ok) return load.offline ? <MarketOffline loaded={false} force onRetry={() => setTick((t) => t + 1)} style={{ marginTop: 14 }} /> : <MarketError thing="your work history" onRetry={() => setTick((t) => t + 1)} style={{ marginTop: 14 }} />;
  return (
    <>
      {load.value.length ? <WorkList list={load.value} /> : empty}
      <LiveReviews />
    </>
  );
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function WorkList({ list }: { list: WorkEntry[] }) {
  const c = useMarketColors();
  const dark = useIsDark();
  const today = todayIso();
  const sorted = sortWork(list, today);
  const tone = (stub: "Role" | "Class slot" | "Ended"): StubTone => {
    if (stub === "Ended") return "muted";
    if (stub === "Role") return 4;
    // CLASS SLOT: step 1's fill and ink with --fill dashes (the board's #AEA1DC).
    const s1 = stubColors(1, c, dark);
    return { ...s1, perf: dark ? s1.perf : c.fill };
  };
  return (
    <>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <CapsLabel as="span">Hired via Centium</CapsLabel>
        <span style={{ fontSize: px(11.5), fontWeight: 700, color: c.tealink }}>{workCountLine(list)}</span>
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((e) => {
          const stub = workStub(e, today);
          const role = workRoleLine(e);
          const meta = workMetaLine(e, today);
          return (
            <TicketStub
              key={e.id}
              stubWidth={46}
              vertical
              labelType={[9.5, "0.1em"]}
              minHeight={96}
              tone={tone(stub)}
              stubLabel={stub}
              ariaLabel={`${e.businessName}, ${role}, ${meta}, Hired via Centium`}
              bodyStyle={{ display: "flex", gap: 12, padding: "12px 14px" }}
            >
              <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: c.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(12.5), fontWeight: 800, color: c.accent, flexShrink: 0 }}>
                {initialsOf(e.businessName)}
              </span>
              <span aria-hidden style={{ flex: 1, minWidth: 0, display: "block" }}>
                <span style={{ display: "block", fontSize: px(12), fontWeight: 600, color: c.accent }}>{e.businessName}</span>
                <span style={{ display: "block", fontSize: px(14), lineHeight: lh(19), fontWeight: 700, color: c.ink }}>{role}</span>
                <span style={{ display: "block", fontSize: px(11.5), color: c.faint, marginTop: 1 }}>{meta}</span>
                <span style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(11), fontWeight: 700, color: c.tealink }}>
                  <TicketCheck size={12} />
                  Hired via Centium
                </span>
              </span>
            </TicketStub>
          );
        })}
      </div>
    </>
  );
}

/** The live reviews about me (professional_reviews), as W3 drew them. */
function LiveReviews() {
  const c = useMarketColors();
  const navigate = useNavigate();
  const { reviews, loading, error, reload } = useReviewsAboutMe();
  const shown = reviews.filter((r) => !r.redactedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const avg = averageOf(reviews);
  const LIMIT = 3;
  return error && !shown.length ? (
    <MarketError thing="your reviews" onRetry={() => void reload()} style={{ marginTop: 18 }} />
  ) : loading && !shown.length ? (
    <MarketSkeleton radius={20} rows={3} height={120} label="Loading your reviews" style={{ marginTop: 18 }} />
  ) : shown.length ? (
    <>
      <CapsLabel style={{ marginTop: 18 }}>{`Reviews · ${shown.length}`}</CapsLabel>
      <div style={{ marginTop: 8, borderRadius: 20, background: c.card, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
          <span style={{ fontSize: px(30), lineHeight: lh(34), fontWeight: 800 }}>{avg !== null ? avg.toFixed(1) : "–"}</span>
          <div>
            <span role="img" aria-label={avg !== null ? `${avg.toFixed(1)} out of 5` : "No rating"}>
              <Stars filled={avg !== null ? Math.round(avg) : 0} />
            </span>
            <div style={{ fontSize: px(11.5), color: c.faint, marginTop: 2 }}>From your clients</div>
          </div>
        </div>
        {shown.slice(0, LIMIT).map((r) => (
          <div key={r.id} style={{ padding: "12px 16px", borderTop: `0.5px solid ${c.div}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: px(12.5) }}>
              <span style={{ fontWeight: 800 }}>{reviewerLabel(r.reviewerName)}</span>
              <span style={{ color: c.faint, flexShrink: 0 }}>{formatShortDate(new Date(r.createdAt), { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <span role="img" aria-label={`${r.rating} out of 5`} style={{ display: "inline-flex", marginTop: 2 }}>
              <Stars filled={r.rating} />
            </span>
            {r.body ? <div style={{ fontSize: px(12.5), lineHeight: lh(18), color: c.ink2, marginTop: 4 }}>{r.body}</div> : null}
          </div>
        ))}
      </div>
      {shown.length > LIMIT ? <WideButton onClick={() => navigate("/app/more/reviews")}>See all reviews</WideButton> : null}
    </>
  ) : null;
}

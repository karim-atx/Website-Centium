import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  Bold,
  CalendarX,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck,
  FileText,
  Heading,
  History,
  Lightbulb,
  Link as LinkIcon,
  List,
  ListOrdered,
  Repeat,
  RotateCcw,
  Trash2,
  Truck,
  UserX,
} from "lucide-react";
import { BizButton, BizDropdown, BizField, BizFieldButton, BizPage, BizRow, BizSection, BizSheet, BizConfirm, LoadError, RowsSkeleton, LIST_BG, BORDER } from "../../components/business-more/kit";
import { useBizToast } from "../../components/business-more/useBizToast";
import { useBusiness } from "../../components/business-more/useBusiness";
import type { BizKind } from "../../components/business-more/kind";
import {
  fetchLocations,
  fetchPolicy,
  fetchStoreSettings,
  publishPolicyVersion,
  saveStoreSettings,
  type BizLocation,
  type PolicyDoc,
  type PolicyKind,
  type StoreSettings,
} from "../../services/business-more";
import { composeReturns, DELIVERY_TIMES, dollars, parseReturns, RETURN_WINDOWS, type ReturnCondition, type ReturnWindow } from "./storePolicyText";
import { formatShortDate } from "../../utils/date";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { fetchBookingPolicies, setBookingPolicy } from "../../services/business-classes/schedule";
import { effectiveRules, policyFor, POLICY_FALLBACK, type BookingPolicy, type PolicyField } from "../../services/business-classes/scheduleRules";
import { fetchNoShowPause, POLICY_COPY, setNoShowPause } from "../../services/no-shows";
import { t, tk, tn } from "../../i18n/core";

// MO1B-001 / -003 / -005 and OURS-MO1B-booking-policies, -waiver-editor,
// -store-policies-edit. One sub-page row for all of them (V6-109: BizMoreV8's
// 12/700; BizTypeKit drew 13.5/700 for its three policy frames).
//
// WHAT IS LIVE: the cancellation window, booking window, booking close and
// waitlist size (B9 business_booking_policies, the business default row),
// every policy document with versions and acceptances (B5 policy_documents /
// policy_versions / policy_acceptances), and the store's returns, exchanges,
// delivery and pickup (B5 business_store_settings). Still without columns:
// late-cancel counting and fees, offering freed spots automatically and
// class reminders; those rows are shown, dimmed, with "Coming soon" and do
// nothing. No sample values ($5) ship.
//
// Round F2 AB4 (Karim F20): "Pause bookings after 3 no-shows" is live, on by
// default: business_profiles.no_show_pause, written by set_no_show_pause
// (staff with schedule). It is on the business, not a booking-policy row
// (that table has a row per class type), so it has its own read and write.

const fmtDate = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

const DOC_TITLE: Record<PolicyKind, string> = {
  waiver: tk("Liability waiver"),
  class_terms: tk("Class terms"),
  house_rules: tk("House rules"),
  returns: tk("Returns policy"),
  delivery: tk("Delivery terms"),
  appointment_waiver: tk("Appointment waiver"),
};

// Round G (EH5): the booking-window and closing labels in the app's language
// (scheduleRules' daysAhead / minutesBefore are English).
const daysLabel = (d: number) => tn(d, "{n} day", "{n} days");
const beforeLabel = (m: number) => (m === 0 ? t("At class time") : m % 60 === 0 ? tn(m / 60, "{n} hour before", "{n} hours before") : t("{n} min before", { n: m }));
const freeUntil = (h: number) => tn(h, "Free until {n} hour before", "Free until {n} hours before");

// The starting templates below stay English: they become the business's own
// published policy text (Round F: business policy templates stay English).

/** LEGAL_AND_HELP.md "Templates": the starting text before a first version. */
const TEMPLATE: Record<PolicyKind, (kind: BizKind) => string> = {
  waiver: (k) =>
    [
      k === "gym" ? "Before your first visit" : "Before your first class",
      "• Tell your instructor or staff about any injury or condition.",
      "• Use props and equipment only as shown.",
      "• Stop if you feel pain or dizziness.",
      ...(k === "gym" ? ["• Under 16s need a parent or guardian."] : []),
      "",
      "By booking, you accept that exercise carries some risk.",
    ].join("\n"),
  class_terms: () =>
    ["Bookings and cancellations", "• Cancel free until 12 hours before class (or the window you set).", "• Late cancels count as a used class."].join("\n"),
  house_rules: () => ["• Wipe equipment after use.", "• Re-rack weights when you're done."].join("\n"),
  returns: () =>
    [
      "• Return unopened items within 14 days.",
      "• Bring your receipt or order number.",
      "• Refunds go back to the original payment.",
      "• Opened supplements can't be returned for safety.",
    ].join("\n"),
  delivery: () => ["• We deliver within 1 to 2 days.", "• Someone must be there to receive the order."].join("\n"),
  appointment_waiver: () =>
    ["Before your first appointment", "• Tell us about any injury or condition.", "• Stop if you feel pain or dizziness."].join("\n"),
};

const HOW_SEEN: Partial<Record<PolicyKind, (k: BizKind) => string>> = {
  waiver: (k) =>
    k === "gym"
      ? t("Shown once, before a client's first visit. They tick I've read and accept the liability waiver to continue.")
      : t("Shown once, before a client's first booking. They tick I've read and accept the liability waiver to continue."),
  class_terms: () => t("Shown at checkout."),
  house_rules: () => t("Shown on your listing."),
  returns: () => t("Shown before checkout."),
  delivery: () => t("Shown before checkout when delivery is chosen."),
  appointment_waiver: () => t("Shown once, before a client's first appointment."),
};

function useLocations(bizId: string | null) {
  const [locs, setLocs] = useState<BizLocation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchLocations(bizId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setLocs(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, tick]);
  return { locs, error, reload: () => setTick((t) => t + 1) };
}

// ---------------------------------------------------------------------------
// B9 (CL-05) · business_booking_policies: the business default row
// (class_type null). Public to read on a listed business, written with the
// `schedule` permission. The cancellation window used to be written to every
// venue's gyms.default_cancellation_hours; the default row now outranks the
// venue (class → type → default → venue → 12 h), so it is written there and
// the venue's value is only shown as the fallback when no default is set.

function usePolicyDefault(bizId: string | null) {
  const [rows, setRows] = useState<BookingPolicy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchBookingPolicies(bizId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setRows(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, tick]);
  return { rows, setRows, error, reload: () => setTick((t) => t + 1) };
}

/** AB4: business_profiles.no_show_pause (null until read; a failed read leaves the toggle off and disabled). */
function useNoShowPause(bizId: string | null) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchNoShowPause(bizId).then((r) => {
      if (!cancelled && r.ok) setOn(r.value);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId]);
  return { on, setOn };
}

// ---------------------------------------------------------------------------
// MO1B-001 / -003 · Booking policies (Gym: Entry rules) summary

export function BookingPoliciesPage() {
  const navigate = useNavigate();
  const { business, kind, kindKnown } = useBusiness();
  const { locs, error, reload } = useLocations(business?.id ?? null);
  const pol = usePolicyDefault(business?.id ?? null);
  const noShow = useNoShowPause(business?.id ?? null);
  const gym = kind === "gym";
  const venueHours = locs?.[0]?.cancellationHours ?? null;
  const own = pol.rows ? policyFor(pol.rows, null)?.cancellationHours ?? null : null;
  const hours = own ?? venueHours;
  const loadError = error ?? pol.error;
  return (
    <BizPage title={!kindKnown ? t("Policies") : gym ? t("Entry rules") : t("Booking policies")}>
      {loadError && (
        <LoadError
          message={t("Couldn't load your policies.")}
          onRetry={() => {
            reload();
            pol.reload();
          }}
        />
      )}
      {(!locs || !pol.rows) && !loadError ? (
        <RowsSkeleton rows={3} label={t("Loading your policies")} />
      ) : (
        <>
          <BizSection label={t("Cancellations")}>
            <BizRow
              icon={CalendarX}
              title={freeUntil(hours === null ? 12 : hours)}
              desc={t("After that it counts as used")}
              onClick={() => navigate("/app/business/more/policies/edit?section=cancellations")}
            />
          </BizSection>
          {/* AB4: the no-show pause, set in the editor. */}
          {noShow.on !== null && (
            <BizSection label={t(POLICY_COPY.section)}>
              <BizRow
                icon={UserX}
                title={t(noShow.on ? POLICY_COPY.title : POLICY_COPY.summaryOff)}
                desc={noShow.on ? t(POLICY_COPY.desc) : undefined}
                onClick={() => navigate("/app/business/more/policies/edit?section=late")}
              />
            </BizSection>
          )}
          <BizSection label={t("Documents")}>
            <BizRow
              icon={FileCheck}
              title={t("Liability waiver")}
              desc={gym ? t("Accepted once, before the first visit") : t("Accepted once, before the first booking")}
              onClick={() => navigate("/app/business/more/policy/waiver")}
            />
            {!gym && <BizRow icon={FileText} title={t("Class terms")} desc={t("Shown at checkout")} onClick={() => navigate("/app/business/more/policy/class_terms")} />}
            {gym && <BizRow icon={FileText} title={t("House rules")} desc={t("Optional")} onClick={() => navigate("/app/business/more/policy/house_rules")} />}
          </BizSection>
        </>
      )}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// OURS-MO1B-booking-policies · the full editor

const WINDOWS = [12, 24, 2];
/** OURS picker values (BizMoreV8 draws only the values 14 days / 30 min before / 5 people). */
const AHEAD = [7, 14, 21, 30, 60, 90];
const CLOSES = [0, 15, 30, 60, 120];
const WAITLIST = [3, 5, 10, 20];

type PolicyMenu = "ahead" | "closes" | "size" | null;

export function BookingPoliciesEditor() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { business, kind, kindKnown } = useBusiness();
  const { locs, error, reload } = useLocations(business?.id ?? null);
  const pol = usePolicyDefault(business?.id ?? null);
  const noShow = useNoShowPause(business?.id ?? null);
  const access = useConsoleAccess();
  const [toast, showToast] = useBizToast();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<PolicyMenu>(null);
  const gym = kind === "gym";
  const venueHours = locs?.[0]?.cancellationHours ?? null;
  const row = pol.rows ? policyFor(pol.rows, null) : null;
  const eff = effectiveRules(pol.rows ?? [], null, venueHours);
  const current = row?.cancellationHours ?? venueHours ?? POLICY_FALLBACK.cancellationHours;
  // Writing needs `schedule` (the table's RLS); the owner always has it.
  const canWrite = access.ready ? access.meets("schedule") : false;
  const ready = !!locs && !!pol.rows;
  const loadError = error ?? pol.error;

  // ?section= scrolls to the section a More row opened.
  const section = new URLSearchParams(search).get("section");
  useEffect(() => {
    if (!section || !ready) return;
    document.getElementById(`pol-${section}`)?.scrollIntoView({ block: "start" });
  }, [section, ready]);

  const write = async (field: PolicyField, value: number, done: string) => {
    if (!business?.id || !pol.rows || busy) return;
    setBusy(true);
    setMenu(null);
    const r = await setBookingPolicy(business.id, row, null, field, value);
    setBusy(false);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    pol.setRows([...pol.rows.filter((p) => p.id !== r.value.id && p.classType !== null), r.value]);
    showToast(done);
  };

  const writeNoShow = async (on: boolean) => {
    if (!business?.id || busy) return;
    setBusy(true);
    const r = await setNoShowPause(business.id, on);
    setBusy(false);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    noShow.setOn(r.value);
    showToast(t(r.value ? POLICY_COPY.on : POLICY_COPY.off));
  };

  const soon = t("Coming soon");
  const off = !canWrite || busy;
  const noShowRow = (
    <BizRow
      title={t(POLICY_COPY.title)}
      desc={t(POLICY_COPY.desc)}
      toggle={{ checked: noShow.on === true, onChange: (v) => void writeNoShow(v), disabled: off || noShow.on === null }}
    />
  );
  return (
    <BizPage title={!kindKnown ? t("Policies") : gym ? t("Entry rules") : t("Booking policies")} sub={t("Applied to every class unless a class type overrides it.")}>
      {loadError && (
        <LoadError
          message={t("Couldn't load your policies.")}
          onRetry={() => {
            reload();
            pol.reload();
          }}
        />
      )}
      {!ready && !loadError && <RowsSkeleton rows={4} label={t("Loading your policies")} />}
      {ready && (
        <>
          <BizSection id="pol-cancellations" label={t("Cancellations")} footer={access.ready && !canWrite ? t("Only staff who manage the schedule can change these.") : undefined}>
            {WINDOWS.map((h) => (
              <BizRow
                key={h}
                title={freeUntil(h)}
                desc={h === 12 ? t("After that, the booking counts as used") : undefined}
                radio={{ selected: current === h }}
                onClick={() => current !== h && void write("cancellationHours", h, t("Cancellation window saved."))}
                disabled={off}
              />
            ))}
            {!WINDOWS.includes(current) && <BizRow title={freeUntil(current)} radio={{ selected: true }} />}
          </BizSection>
          {!gym && (
            <>
              <BizSection id="pol-late" label={t("Late cancels and no-shows")} footer={t(POLICY_COPY.lateSoon)}>
                <BizRow title={t("Count a late cancel as a used class")} desc={t("For packs and limited memberships")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                <BizRow title={t("Charge a late-cancel fee")} desc={t("Paid with the next booking")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                {noShowRow}
              </BizSection>
              <BizSection id="pol-window" label={t("Booking window")}>
                <BizRow title={t("How far ahead clients can book")} value={daysLabel(eff.bookingWindowDays)} drop onClick={() => setMenu(menu === "ahead" ? null : "ahead")} disabled={off} />
                {menu === "ahead" && (
                  <BizDropdown
                    label={t("How far ahead clients can book")}
                    options={(AHEAD.includes(eff.bookingWindowDays) ? AHEAD : [...AHEAD, eff.bookingWindowDays].sort((a, b) => a - b)).map((d) => ({ value: String(d), label: daysLabel(d) }))}
                    value={String(eff.bookingWindowDays)}
                    onPick={(v) => void write("bookingWindowDays", Number(v), t("Booking window saved."))}
                  />
                )}
                <BizRow title={t("Booking closes")} value={beforeLabel(eff.closesMinutesBefore)} drop onClick={() => setMenu(menu === "closes" ? null : "closes")} disabled={off} />
                {menu === "closes" && (
                  <BizDropdown
                    label={t("Booking closes")}
                    options={(CLOSES.includes(eff.closesMinutesBefore) ? CLOSES : [...CLOSES, eff.closesMinutesBefore].sort((a, b) => a - b)).map((m) => ({ value: String(m), label: beforeLabel(m) }))}
                    value={String(eff.closesMinutesBefore)}
                    onPick={(v) => void write("closesMinutesBefore", Number(v), t("Booking window saved."))}
                  />
                )}
              </BizSection>
              <BizSection id="pol-waitlist" label={t("Waitlist")} footer={t("Offering freed spots automatically is coming soon.")}>
                <BizRow
                  title={t("Waitlist when a class is full")}
                  toggle={{ checked: eff.waitlistCap > 0, onChange: (v) => void write("waitlistCap", v ? POLICY_FALLBACK.waitlistCap : 0, v ? t("Waitlist turned on.") : t("Waitlist turned off.")), disabled: off }}
                />
                <BizRow title={t("Offer freed spots automatically")} desc={t("The first person has 30 minutes to accept")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                {eff.waitlistCap > 0 && (
                  <>
                    <BizRow title={t("Waitlist size")} value={tn(eff.waitlistCap, "{n} person", "{n} people")} drop onClick={() => setMenu(menu === "size" ? null : "size")} disabled={off} />
                    {menu === "size" && (
                      <BizDropdown
                        label={t("Waitlist size")}
                        options={(WAITLIST.includes(eff.waitlistCap) ? WAITLIST : [...WAITLIST, eff.waitlistCap].sort((a, b) => a - b)).map((n) => ({ value: String(n), label: tn(n, "{n} person", "{n} people") }))}
                        value={String(eff.waitlistCap)}
                        onPick={(v) => void write("waitlistCap", Number(v), t("Waitlist size saved."))}
                      />
                    )}
                  </>
                )}
              </BizSection>
              <BizSection id="pol-reminders" label={t("Reminders")} footer={soon}>
                <BizRow title={t("Remind clients before class")} toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                <BizRow title={t("When")} dim />
              </BizSection>
            </>
          )}
          {/* AB4: a gym's classes take the same pause (book_class is the same for every business). */}
          {gym && (
            <BizSection id="pol-late" label={t(POLICY_COPY.section)}>
              {noShowRow}
            </BizSection>
          )}
          <BizSection id="pol-terms" label={t("Terms and waivers")}>
            <BizRow
              icon={FileCheck}
              title={t("Liability waiver")}
              desc={gym ? t("Accepted once, before the first visit") : t("Accepted once, before the first booking")}
              value={t("Edit")}
              onClick={() => navigate("/app/business/more/policy/waiver")}
            />
            {gym ? (
              <BizRow icon={FileText} title={t("House rules")} desc={t("Optional")} value={t("Edit")} onClick={() => navigate("/app/business/more/policy/house_rules")} />
            ) : (
              <BizRow icon={FileText} title={t("Class terms")} desc={t("Shown at checkout")} value={t("Edit")} onClick={() => navigate("/app/business/more/policy/class_terms")} />
            )}
          </BizSection>
        </>
      )}
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// OURS-MO1B-waiver-editor · a document, its versions and acceptances

export function PolicyEditorPage() {
  const navigate = useNavigate();
  const { kind: kindParam, view } = useParams();
  const docKind = (kindParam ?? "waiver") as PolicyKind;
  const { business, kind } = useBusiness();
  const [toast, showToast] = useBizToast();
  const [doc, setDoc] = useState<PolicyDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const bizId = business?.id ?? null;
  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchPolicy(bizId, docKind).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setDoc(r.value);
      const cur = r.value.versions.find((v) => v.version === r.value.currentVersion);
      setText((t) => (t === null ? (cur?.body ?? TEMPLATE[docKind](kind)) : t));
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, docKind, kind, tick]);

  const current = doc?.versions.find((v) => v.version === doc.currentVersion) ?? null;
  const base = current?.body ?? TEMPLATE[docKind](kind);
  const dirty = text !== null && text.trim() !== base.trim();
  const next = (doc ? Math.max(0, ...doc.versions.map((v) => v.version)) : 0) + 1;
  const title = t(DOC_TITLE[docKind]);
  const isWaiver = docKind === "waiver" || docKind === "appointment_waiver";

  const publish = async (reaccept: boolean) => {
    if (!bizId || !doc || !text?.trim()) return;
    setBusy(true);
    const r = await publishPolicyVersion(bizId, docKind, doc, text, reaccept);
    setBusy(false);
    setAsk(false);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    setText(null);
    setTick((t) => t + 1);
    showToast(reaccept || !current ? t("Version {n} saved. Clients accept it at their next booking.", { n: r.value }) : t("Version {n} saved.", { n: r.value }));
  };

  const save = () => {
    if (!doc) return;
    if (current && doc.acceptedCurrent > 0) setAsk(true);
    else void publish(false);
  };

  // Toolbar: plain-text marks the client view understands (heading line, bold, bullets, numbers, link).
  const apply = (mark: "heading" | "bold" | "list" | "ordered" | "link") => {
    const el = area.current;
    if (!el || text === null) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = text.slice(a, b);
    const lineStart = text.lastIndexOf("\n", a - 1) + 1;
    let out = text;
    if (mark === "bold") out = `${text.slice(0, a)}**${sel || "bold"}**${text.slice(b)}`;
    if (mark === "link") out = `${text.slice(0, a)}[${sel || "link"}](https://)${text.slice(b)}`;
    if (mark === "heading") out = `${text.slice(0, lineStart)}# ${text.slice(lineStart)}`;
    if (mark === "list") out = `${text.slice(0, lineStart)}• ${text.slice(lineStart)}`;
    if (mark === "ordered") out = `${text.slice(0, lineStart)}1. ${text.slice(lineStart)}`;
    setText(out);
    requestAnimationFrame(() => el.focus());
  };

  if (view === "history") {
    const readingV = doc?.versions.find((v) => v.version === reading) ?? null;
    return (
      <BizPage title={t("Version history")} sub={title}>
        {error && <LoadError onRetry={() => setTick((t) => t + 1)} />}
        {!doc && !error && <RowsSkeleton rows={3} />}
        {doc && doc.versions.length === 0 && (
          <BizSection>
            <BizRow icon={FileText} title={t("No versions yet")} desc={t("Save your first version to publish it")} />
          </BizSection>
        )}
        {doc && doc.versions.length > 0 && (
          <BizSection label={t("Versions")}>
            {doc.versions.map((v) => (
              <BizRow
                key={v.id}
                icon={FileText}
                title={v.version === doc.currentVersion ? t("Version {n} · current", { n: v.version }) : t("Version {n}", { n: v.version })}
                desc={
                  v.version === doc.currentVersion
                    ? `${v.publishedAt ? fmtDate(v.publishedAt) : t("Draft")} · ${tn(doc.acceptedCurrent, "accepted by {n} client", "accepted by {n} clients")}`
                    : `${v.publishedAt ? fmtDate(v.publishedAt) : t("Draft")} · ${t("read-only")}`
                }
                value={t("View")}
                onClick={() => setReading(v.version)}
              />
            ))}
          </BizSection>
        )}
        {readingV && (
          <BizSheet open onClose={() => setReading(null)} title={t("Version {n}", { n: readingV.version })} lead={readingV.publishedAt ? t("Published {date}. Read-only.", { date: fmtDate(readingV.publishedAt) }) : t("Read-only.")}>
            <p className="whitespace-pre-wrap text-[13px] leading-[20px] text-charcoal">{readingV.body}</p>
          </BizSheet>
        )}
      </BizPage>
    );
  }

  return (
    <BizPage title={title} onBack={dirty ? () => setDiscard(true) : undefined}>
      {error && <LoadError onRetry={() => setTick((t) => t + 1)} />}
      {!doc && !error && <RowsSkeleton rows={3} />}
      {doc && text !== null && (
        <>
          <p className="text-[11.5px] font-bold text-charcoal-faint" style={{ margin: "0 0 10px" }}>
            {current && current.publishedAt ? t("Version {n} · last updated {date}", { n: current.version, date: fmtDate(current.publishedAt) }) : t("Not published yet · starts from our template")}
          </p>
          <div className="overflow-hidden border-[1.5px] border-primary" style={{ borderRadius: 16, marginBottom: 12 }}>
            <div role="toolbar" aria-label={t("Formatting")} className={clsx("flex border-b", LIST_BG, BORDER)} style={{ gap: 4, padding: "6px 8px" }}>
              {(
                [
                  ["heading", Heading, t("Heading")],
                  ["bold", Bold, t("Bold")],
                  ["list", List, t("Bulleted list")],
                  ["ordered", ListOrdered, t("Numbered list")],
                  ["link", LinkIcon, t("Link")],
                ] as const
              ).map(([m, Icon, label]) => (
                <button key={m} type="button" aria-label={label} onClick={() => apply(m)} className="tap flex items-center justify-center text-charcoal-soft" style={{ width: 36, height: 36, borderRadius: 9 }}>
                  <Icon size={16} strokeWidth={2.2} aria-hidden />
                </button>
              ))}
            </div>
            <label htmlFor="policy-body" className="sr-only">
              {title}
            </label>
            <textarea
              id="policy-body"
              ref={area}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="block w-full resize-y bg-transparent outline-none text-[13px] leading-[20px] text-charcoal"
              style={{ padding: "12px 14px", minHeight: 180 }}
              maxLength={50000}
            />
          </div>
          {HOW_SEEN[docKind] && (
            <>
              <p className="text-[12.5px] font-extrabold text-charcoal" style={{ margin: "4px 0 8px" }}>
                {t("How clients see it")}
              </p>
              <p className="text-[12px] leading-[19px] text-charcoal-soft" style={{ margin: "0 0 12px" }}>
                {HOW_SEEN[docKind]!(kind)}
              </p>
            </>
          )}
          <BizSection>
            <BizRow
              icon={History}
              title={t("Version history")}
              desc={tn(doc.versions.length, "{n} version", "{n} versions")}
              onClick={() => navigate(`/app/business/more/policy/${docKind}/history`)}
            />
          </BizSection>
          <BizButton label={t("Save as version {n}", { n: next })} onClick={save} disabled={!dirty && !!current} busy={busy} />
        </>
      )}
      <BizConfirm
        open={ask}
        icon={FileCheck}
        title={t("Ask clients to accept again?")}
        body={tn(doc?.acceptedCurrent ?? 0, "{n} client accepted version {version}. Ask them to accept version {next} at their next booking, or keep their acceptance as it is.", "{n} clients accepted version {version}. Ask them to accept version {next} at their next booking, or keep their acceptance as it is.", { version: current?.version ?? "", next })}
        // D7: default Yes for waivers, No for class terms (the first button is focused on open).
        action={isWaiver ? t("Yes, at their next booking") : t("No, keep their acceptance")}
        secondary={{ label: isWaiver ? t("No, keep their acceptance") : t("Yes, at their next booking"), onClick: () => void publish(!isWaiver) }}
        cancel={t("Keep editing")}
        busy={busy}
        onAction={() => void publish(isWaiver)}
        onCancel={() => setAsk(false)}
      />
      <BizConfirm
        open={discard}
        icon={Trash2}
        title={t("Discard your changes?")}
        body={current ? t("The {title} stays at version {n}.", { title: title.toLowerCase(), n: current.version }) : t("The {title} stays unpublished.", { title: title.toLowerCase() })}
        action={t("Discard")}
        cancel={t("Keep editing")}
        onAction={() => {
          setDiscard(false);
          navigate(-1);
        }}
        onCancel={() => setDiscard(false)}
      />
      {toast}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// MO1B-005 · Store policies (+ OURS-MO1B-store-policies-edit)

export function StorePoliciesPage() {
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [toast, showToast] = useBizToast();
  const [s, setS] = useState<StoreSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [sheet, setSheet] = useState<"returns" | "delivery" | null>(null);
  const [busy, setBusy] = useState(false);
  const bizId = business?.id ?? null;
  const wellness = business?.type === "wellness_service";

  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchStoreSettings(bizId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setS(r.value);
        setError(null);
      } else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [bizId, tick]);

  const persist = async (next: StoreSettings): Promise<string | null> => {
    if (!bizId) return t("Couldn't save. Try again.");
    setBusy(true);
    const r = await saveStoreSettings(bizId, next);
    setBusy(false);
    if (!r.ok) return r.message;
    setS(r.value);
    setSheet(null);
    showToast(t("Policies updated."));
    return null;
  };

  const ret = s ? parseReturns(s.returnsPolicy) : null;
  return (
    <BizPage title={t("Store policies")}>
      {error && <LoadError message={t("Couldn't load your policies.")} onRetry={() => setTick((t) => t + 1)} />}
      {!s && !error && <RowsSkeleton rows={4} label={t("Loading your policies")} />}
      {s && ret && (
        <>
          <BizSection label={t("Returns")}>
            <BizRow
              icon={RotateCcw}
              title={!s.returnsPolicy ? t("Not set yet") : !ret.ours ? t("Your returns policy") : ret.window === "none" ? t("No returns") : t("Returns within {n} days", { n: ret.window })}
              desc={!s.returnsPolicy ? t("Add how customers can return items") : !ret.ours ? s.returnsPolicy : ret.window === "none" ? undefined : ret.condition === "unopened" ? t("Unopened items only") : t("Any condition")}
              onClick={() => setSheet("returns")}
            />
            <BizRow icon={Repeat} title={t("Exchanges")} desc={s.allowExchanges ? t("Allowed") : t("Not offered")} onClick={() => setSheet("returns")} />
          </BizSection>
          <BizSection label={t("Delivery")}>
            {s.deliveryEnabled ? (
              <>
                <BizRow
                  icon={Truck}
                  title={t("Delivery fee")}
                  desc={s.freeDeliveryOver !== null ? t("Free over {amount}", { amount: dollars(s.freeDeliveryOver) }) : undefined}
                  value={s.deliveryFee !== null ? <span className="text-[13px] font-extrabold text-charcoal">{dollars(s.deliveryFee)}</span> : undefined}
                  onClick={() => setSheet("delivery")}
                />
                <BizRow
                  icon={Clock}
                  title={t("Delivery time")}
                  value={s.deliveryTimeText ? <span className="text-[13px] font-extrabold text-charcoal">{s.deliveryTimeText}</span> : undefined}
                  onClick={() => setSheet("delivery")}
                />
              </>
            ) : (
              <BizRow icon={Truck} title={t("Delivery")} desc={t("Off · turn it on to set a fee and time")} onClick={() => setSheet("delivery")} />
            )}
            <BizRow
              title={t("Pickup")}
              desc={t("Customers collect from your store")}
              toggle={{ checked: s.pickupEnabled, disabled: busy, onChange: (v) => void persist({ ...s, pickupEnabled: v }) }}
            />
          </BizSection>
          <BizSection label={t("Documents")}>
            <BizRow icon={FileCheck} title={t("Terms clients accept")} desc={t("Shown before checkout")} onClick={() => navigate("/app/business/more/policy/returns")} />
            {wellness && <BizRow icon={FileCheck} title={t("Terms and waivers")} desc={t("For appointments")} onClick={() => navigate("/app/business/more/policy/appointment_waiver")} />}
          </BizSection>
          {/* MO1B-005 row 4: the tip. */}
          <div className="flex items-start bg-primary-pale text-primary-dark" style={{ gap: 10, borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
            <Lightbulb size={15} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
            <p className="text-[12.5px] leading-[18px]">{t("Waivers are hidden for stores. Wellness Service stores can turn them on for appointments.")}</p>
          </div>
          {sheet === "returns" && <ReturnsSheet settings={s} onClose={() => setSheet(null)} onSave={persist} />}
          {sheet === "delivery" && <DeliverySheet settings={s} onClose={() => setSheet(null)} onSave={persist} />}
        </>
      )}
      {toast}
    </BizPage>
  );
}

const windowOptions = (): { value: string; label: string }[] => [
  ...RETURN_WINDOWS.map((w) => ({ value: String(w), label: daysLabel(w) })),
  { value: "none", label: t("No returns") },
];
const conditionOptions = (): { value: ReturnCondition; label: string }[] => [
  { value: "unopened", label: t("Unopened items only") },
  { value: "any", label: t("Any condition") },
];

function ReturnsSheet({ settings, onClose, onSave }: { settings: StoreSettings; onClose: () => void; onSave: (s: StoreSettings) => Promise<string | null> }) {
  const p = parseReturns(settings.returnsPolicy);
  const [win, setWin] = useState<ReturnWindow>(p.window);
  const [cond, setCond] = useState<ReturnCondition>(p.condition);
  const [ex, setEx] = useState(settings.allowExchanges);
  const [open, setOpen] = useState<"win" | "cond" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <BizSheet open onClose={onClose} title={t("Returns")} lead={t("What customers can send back, and for how long.")}>
      <BizFieldButton
        id="ret-window"
        label={t("Return window")}
        value={win === "none" ? t("No returns") : daysLabel(win)}
        icon={open === "win" ? ChevronUp : ChevronDown}
        expanded={open === "win"}
        onClick={() => setOpen(open === "win" ? null : "win")}
      />
      {open === "win" && (
        <BizDropdown
          label={t("Return window")}
          options={windowOptions()}
          value={String(win)}
          onPick={(v) => {
            setWin(v === "none" ? "none" : (Number(v) as ReturnWindow));
            setOpen(null);
          }}
        />
      )}
      {win !== "none" && (
        <>
          <BizFieldButton
            id="ret-cond"
            label={t("Condition")}
            value={conditionOptions().find((c) => c.value === cond)?.label}
            icon={open === "cond" ? ChevronUp : ChevronDown}
            expanded={open === "cond"}
            onClick={() => setOpen(open === "cond" ? null : "cond")}
          />
          {open === "cond" && (
            <BizDropdown
              label={t("Condition")}
              options={conditionOptions()}
              value={cond}
              onPick={(v) => {
                setCond(v);
                setOpen(null);
              }}
            />
          )}
        </>
      )}
      <div className={LIST_BG} style={{ borderRadius: 18, padding: "4px 0", marginBottom: 12 }}>
        <BizRow title={t("Allow exchanges")} toggle={{ checked: ex && win !== "none", onChange: setEx, disabled: win === "none" }} />
      </div>
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton
        label={t("Save")}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          const failed = await onSave({ ...settings, returnsPolicy: composeReturns(win, cond), allowExchanges: win !== "none" && ex });
          setBusy(false);
          if (failed) setError(failed);
        }}
      />
    </BizSheet>
  );
}

function DeliverySheet({ settings, onClose, onSave }: { settings: StoreSettings; onClose: () => void; onSave: (s: StoreSettings) => Promise<string | null> }) {
  const [on, setOn] = useState(settings.deliveryEnabled);
  const [fee, setFee] = useState(settings.deliveryFee !== null ? String(settings.deliveryFee) : "");
  const [over, setOver] = useState(settings.freeDeliveryOver !== null ? String(settings.freeDeliveryOver) : "");
  const [time, setTime] = useState(settings.deliveryTimeText ?? "");
  const [timeOpen, setTimeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parse = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const feeN = parse(fee);
  const overN = parse(over);
  const bad = (feeN !== null && (isNaN(feeN) || feeN < 0 || feeN > 1000)) || (overN !== null && (isNaN(overN) || overN <= 0 || overN > 100000));
  return (
    <BizSheet open onClose={onClose} title={t("Delivery")} lead={t("Only shown when you deliver.")}>
      <div className={LIST_BG} style={{ borderRadius: 18, padding: "4px 0", marginBottom: 12 }}>
        <BizRow title={t("Offer delivery")} toggle={{ checked: on, onChange: setOn }} />
      </div>
      {on && (
        <>
          <BizField id="del-fee" label={t("Delivery fee ($)")} value={fee} onChange={setFee} inputMode="decimal" placeholder="0" />
          <BizField id="del-over" label={t("Free delivery over ($)")} value={over} onChange={setOver} inputMode="decimal" placeholder={t("Optional")} />
          <BizFieldButton
            id="del-time"
            label={t("Delivery time")}
            value={time ? t(time) : t("Choose")}
            placeholder={!time}
            icon={timeOpen ? ChevronUp : ChevronDown}
            expanded={timeOpen}
            onClick={() => setTimeOpen((o) => !o)}
          />
          {timeOpen && (
            <BizDropdown
              label={t("Delivery time")}
              options={DELIVERY_TIMES.map((d) => ({ value: d, label: t(d) }))}
              value={time}
              onPick={(v) => {
                setTime(v);
                setTimeOpen(false);
              }}
            />
          )}
        </>
      )}
      {(error || bad) && <p role="alert" className="text-[12px] font-bold text-status-high">{error ?? t("Use amounts like 3 or 2.50.")}</p>}
      <BizButton
        label={t("Save")}
        disabled={bad}
        busy={busy}
        onClick={async () => {
          setBusy(true);
          const failed = await onSave({ ...settings, deliveryEnabled: on, deliveryFee: on ? feeN : null, freeDeliveryOver: on ? overN : null, deliveryTimeText: on ? time || null : null });
          setBusy(false);
          if (failed) setError(failed);
        }}
      />
    </BizSheet>
  );
}

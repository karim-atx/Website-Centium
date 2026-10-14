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
  saveCancellationHours,
  saveStoreSettings,
  type BizLocation,
  type PolicyDoc,
  type PolicyKind,
  type StoreSettings,
} from "../../services/business-more";
import { composeReturns, DELIVERY_TIMES, dollars, parseReturns, RETURN_WINDOWS, type ReturnCondition, type ReturnWindow } from "./storePolicyText";
import { formatShortDate } from "../../utils/date";

// MO1B-001 / -003 / -005 and OURS-MO1B-booking-policies, -waiver-editor,
// -store-policies-edit. One sub-page row for all of them (V6-109: BizMoreV8's
// 12/700; BizTypeKit drew 13.5/700 for its three policy frames).
//
// WHAT IS LIVE: the cancellation window (gyms.default_cancellation_hours per
// venue), every policy document with versions and acceptances (B5
// policy_documents / policy_versions / policy_acceptances), and the store's
// returns, exchanges, delivery and pickup (B5 business_store_settings).
// BACKEND BU6-15: booking window, late-cancel rules, waitlist settings and
// class reminders have no columns yet; their rows are shown, dimmed, with
// "Coming soon" and do nothing. No sample values ($5, 14 days, 5 people) ship.

const fmtDate = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

const DOC_TITLE: Record<PolicyKind, string> = {
  waiver: "Liability waiver",
  class_terms: "Class terms",
  house_rules: "House rules",
  returns: "Returns policy",
  delivery: "Delivery terms",
  appointment_waiver: "Appointment waiver",
};

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
    `Shown once, before a client's first ${k === "gym" ? "visit" : "booking"}. They tick I've read and accept the liability waiver to continue.`,
  class_terms: () => "Shown at checkout.",
  house_rules: () => "Shown on your listing.",
  returns: () => "Shown before checkout.",
  delivery: () => "Shown before checkout when delivery is chosen.",
  appointment_waiver: () => "Shown once, before a client's first appointment.",
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
// MO1B-001 / -003 · Booking policies (Gym: Entry rules) summary

export function BookingPoliciesPage() {
  const navigate = useNavigate();
  const { business, kind, kindKnown } = useBusiness();
  const { locs, error, reload } = useLocations(business?.id ?? null);
  const gym = kind === "gym";
  const hours = locs?.[0]?.cancellationHours ?? null;
  return (
    <BizPage title={!kindKnown ? "Policies" : gym ? "Entry rules" : "Booking policies"}>
      {error && <LoadError message="Couldn't load your policies." onRetry={reload} />}
      {!locs && !error ? (
        <RowsSkeleton rows={3} label="Loading your policies" />
      ) : (
        <>
          <BizSection label="Cancellations">
            <BizRow
              icon={CalendarX}
              title={hours === null ? "Not set yet" : `Free until ${hours} hours before`}
              desc={hours === null ? "Add a location to set your cancellation window" : "After that it counts as used"}
              onClick={() => navigate("/app/business/more/policies/edit?section=cancellations")}
            />
          </BizSection>
          <BizSection label="Documents">
            <BizRow
              icon={FileCheck}
              title="Liability waiver"
              desc={gym ? "Accepted once, before the first visit" : "Accepted once, before the first booking"}
              onClick={() => navigate("/app/business/more/policy/waiver")}
            />
            {!gym && <BizRow icon={FileText} title="Class terms" desc="Shown at checkout" onClick={() => navigate("/app/business/more/policy/class_terms")} />}
            {gym && <BizRow icon={FileText} title="House rules" desc="Optional" onClick={() => navigate("/app/business/more/policy/house_rules")} />}
          </BizSection>
        </>
      )}
    </BizPage>
  );
}

// ---------------------------------------------------------------------------
// OURS-MO1B-booking-policies · the full editor

const WINDOWS = [12, 24, 2];

export function BookingPoliciesEditor() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { business, kind, kindKnown } = useBusiness();
  const { locs, error, reload } = useLocations(business?.id ?? null);
  const [toast, showToast] = useBizToast();
  const [busy, setBusy] = useState(false);
  const gym = kind === "gym";
  const current = locs?.[0]?.cancellationHours ?? null;

  // ?section= scrolls to the section a More row opened.
  const section = new URLSearchParams(search).get("section");
  useEffect(() => {
    if (!section || !locs) return;
    document.getElementById(`pol-${section}`)?.scrollIntoView({ block: "start" });
  }, [section, locs]);

  const pick = async (h: number) => {
    if (!locs || locs.length === 0 || busy || h === current) return;
    setBusy(true);
    const r = await saveCancellationHours(
      locs.map((l) => l.id),
      h
    );
    setBusy(false);
    if (!r.ok) {
      showToast(r.message);
      return;
    }
    reload();
    showToast("Cancellation window saved.");
  };

  const soon = "Coming soon";
  return (
    <BizPage title={!kindKnown ? "Policies" : gym ? "Entry rules" : "Booking policies"} sub="Applied to every class unless a class type overrides it.">
      {error && <LoadError message="Couldn't load your policies." onRetry={reload} />}
      {!locs && !error && <RowsSkeleton rows={4} label="Loading your policies" />}
      {locs && (
        <>
          <BizSection id="pol-cancellations" label="Cancellations" footer={locs.length === 0 ? "Add a location first. Each location keeps this window." : undefined}>
            {WINDOWS.map((h) => (
              <BizRow
                key={h}
                title={`Free until ${h} hours before`}
                desc={h === 12 ? "After that, the booking counts as used" : undefined}
                radio={{ selected: current === h }}
                onClick={() => void pick(h)}
                disabled={locs.length === 0 || busy}
              />
            ))}
            {current !== null && !WINDOWS.includes(current) && <BizRow title={`Free until ${current} hours before`} radio={{ selected: true }} />}
          </BizSection>
          {!gym && (
            <>
              <BizSection id="pol-late" label="Late cancels and no-shows" footer={soon}>
                <BizRow title="Count a late cancel as a used class" desc="For packs and limited memberships" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                <BizRow title="Charge a late-cancel fee" desc="Paid with the next booking" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
              </BizSection>
              <BizSection id="pol-window" label="Booking window" footer={soon}>
                <BizRow title="How far ahead clients can book" dim />
                <BizRow title="Booking closes" dim />
              </BizSection>
              <BizSection id="pol-waitlist" label="Waitlist" footer={soon}>
                <BizRow title="Waitlist when a class is full" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                <BizRow title="Offer freed spots automatically" desc="The first person has 30 minutes to accept" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                <BizRow title="Waitlist size" dim />
              </BizSection>
              <BizSection id="pol-reminders" label="Reminders" footer={soon}>
                <BizRow title="Remind clients before class" toggle={{ checked: false, onChange: () => undefined, disabled: true }} dim />
                <BizRow title="When" dim />
              </BizSection>
            </>
          )}
          <BizSection id="pol-terms" label="Terms and waivers">
            <BizRow
              icon={FileCheck}
              title="Liability waiver"
              desc={gym ? "Accepted once, before the first visit" : "Accepted once, before the first booking"}
              value="Edit"
              onClick={() => navigate("/app/business/more/policy/waiver")}
            />
            {gym ? (
              <BizRow icon={FileText} title="House rules" desc="Optional" value="Edit" onClick={() => navigate("/app/business/more/policy/house_rules")} />
            ) : (
              <BizRow icon={FileText} title="Class terms" desc="Shown at checkout" value="Edit" onClick={() => navigate("/app/business/more/policy/class_terms")} />
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
  const title = DOC_TITLE[docKind];
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
    showToast(reaccept || !current ? `Version ${r.value} saved. Clients accept it at their next booking.` : `Version ${r.value} saved.`);
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
      <BizPage title="Version history" sub={title}>
        {error && <LoadError onRetry={() => setTick((t) => t + 1)} />}
        {!doc && !error && <RowsSkeleton rows={3} />}
        {doc && doc.versions.length === 0 && (
          <BizSection>
            <BizRow icon={FileText} title="No versions yet" desc="Save your first version to publish it" />
          </BizSection>
        )}
        {doc && doc.versions.length > 0 && (
          <BizSection label="Versions">
            {doc.versions.map((v) => (
              <BizRow
                key={v.id}
                icon={FileText}
                title={v.version === doc.currentVersion ? `Version ${v.version} · current` : `Version ${v.version}`}
                desc={
                  v.version === doc.currentVersion
                    ? `${v.publishedAt ? fmtDate(v.publishedAt) : "Draft"} · accepted by ${doc.acceptedCurrent} ${doc.acceptedCurrent === 1 ? "client" : "clients"}`
                    : `${v.publishedAt ? fmtDate(v.publishedAt) : "Draft"} · read-only`
                }
                value="View"
                onClick={() => setReading(v.version)}
              />
            ))}
          </BizSection>
        )}
        {readingV && (
          <BizSheet open onClose={() => setReading(null)} title={`Version ${readingV.version}`} lead={readingV.publishedAt ? `Published ${fmtDate(readingV.publishedAt)}. Read-only.` : "Read-only."}>
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
            {current && current.publishedAt ? `Version ${current.version} · last updated ${fmtDate(current.publishedAt)}` : "Not published yet · starts from our template"}
          </p>
          <div className="overflow-hidden border-[1.5px] border-primary" style={{ borderRadius: 16, marginBottom: 12 }}>
            <div role="toolbar" aria-label="Formatting" className={clsx("flex border-b", LIST_BG, BORDER)} style={{ gap: 4, padding: "6px 8px" }}>
              {(
                [
                  ["heading", Heading, "Heading"],
                  ["bold", Bold, "Bold"],
                  ["list", List, "Bulleted list"],
                  ["ordered", ListOrdered, "Numbered list"],
                  ["link", LinkIcon, "Link"],
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
                How clients see it
              </p>
              <p className="text-[12px] leading-[19px] text-charcoal-soft" style={{ margin: "0 0 12px" }}>
                {HOW_SEEN[docKind]!(kind)}
              </p>
            </>
          )}
          <BizSection>
            <BizRow
              icon={History}
              title="Version history"
              desc={`${doc.versions.length} ${doc.versions.length === 1 ? "version" : "versions"}`}
              onClick={() => navigate(`/app/business/more/policy/${docKind}/history`)}
            />
          </BizSection>
          <BizButton label={`Save as version ${next}`} onClick={save} disabled={!dirty && !!current} busy={busy} />
        </>
      )}
      <BizConfirm
        open={ask}
        icon={FileCheck}
        title="Ask clients to accept again?"
        body={`${doc?.acceptedCurrent ?? 0} ${doc?.acceptedCurrent === 1 ? "client" : "clients"} accepted version ${current?.version ?? ""}. Ask them to accept version ${next} at their next booking, or keep their acceptance as it is.`}
        // D7: default Yes for waivers, No for class terms (the first button is focused on open).
        action={isWaiver ? "Yes, at their next booking" : "No, keep their acceptance"}
        secondary={{ label: isWaiver ? "No, keep their acceptance" : "Yes, at their next booking", onClick: () => void publish(!isWaiver) }}
        cancel="Keep editing"
        busy={busy}
        onAction={() => void publish(isWaiver)}
        onCancel={() => setAsk(false)}
      />
      <BizConfirm
        open={discard}
        icon={Trash2}
        title="Discard your changes?"
        body={current ? `The ${title.toLowerCase()} stays at version ${current.version}.` : `The ${title.toLowerCase()} stays unpublished.`}
        action="Discard"
        cancel="Keep editing"
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
    if (!bizId) return "Couldn't save. Try again.";
    setBusy(true);
    const r = await saveStoreSettings(bizId, next);
    setBusy(false);
    if (!r.ok) return r.message;
    setS(r.value);
    setSheet(null);
    showToast("Policies updated.");
    return null;
  };

  const ret = s ? parseReturns(s.returnsPolicy) : null;
  return (
    <BizPage title="Store policies">
      {error && <LoadError message="Couldn't load your policies." onRetry={() => setTick((t) => t + 1)} />}
      {!s && !error && <RowsSkeleton rows={4} label="Loading your policies" />}
      {s && ret && (
        <>
          <BizSection label="Returns">
            <BizRow
              icon={RotateCcw}
              title={!s.returnsPolicy ? "Not set yet" : !ret.ours ? "Your returns policy" : ret.window === "none" ? "No returns" : `Returns within ${ret.window} days`}
              desc={!s.returnsPolicy ? "Add how customers can return items" : !ret.ours ? s.returnsPolicy : ret.window === "none" ? undefined : ret.condition === "unopened" ? "Unopened items only" : "Any condition"}
              onClick={() => setSheet("returns")}
            />
            <BizRow icon={Repeat} title="Exchanges" desc={s.allowExchanges ? "Allowed" : "Not offered"} onClick={() => setSheet("returns")} />
          </BizSection>
          <BizSection label="Delivery">
            {s.deliveryEnabled ? (
              <>
                <BizRow
                  icon={Truck}
                  title="Delivery fee"
                  desc={s.freeDeliveryOver !== null ? `Free over ${dollars(s.freeDeliveryOver)}` : undefined}
                  value={s.deliveryFee !== null ? <span className="text-[13px] font-extrabold text-charcoal">{dollars(s.deliveryFee)}</span> : undefined}
                  onClick={() => setSheet("delivery")}
                />
                <BizRow
                  icon={Clock}
                  title="Delivery time"
                  value={s.deliveryTimeText ? <span className="text-[13px] font-extrabold text-charcoal">{s.deliveryTimeText}</span> : undefined}
                  onClick={() => setSheet("delivery")}
                />
              </>
            ) : (
              <BizRow icon={Truck} title="Delivery" desc="Off · turn it on to set a fee and time" onClick={() => setSheet("delivery")} />
            )}
            <BizRow
              title="Pickup"
              desc="Customers collect from your store"
              toggle={{ checked: s.pickupEnabled, disabled: busy, onChange: (v) => void persist({ ...s, pickupEnabled: v }) }}
            />
          </BizSection>
          <BizSection label="Documents">
            <BizRow icon={FileCheck} title="Terms clients accept" desc="Shown before checkout" onClick={() => navigate("/app/business/more/policy/returns")} />
            {wellness && <BizRow icon={FileCheck} title="Terms and waivers" desc="For appointments" onClick={() => navigate("/app/business/more/policy/appointment_waiver")} />}
          </BizSection>
          {/* MO1B-005 row 4: the tip. */}
          <div className="flex items-start bg-primary-pale text-primary-dark" style={{ gap: 10, borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
            <Lightbulb size={15} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2 }} />
            <p className="text-[12.5px] leading-[18px]">Waivers are hidden for stores. Wellness Service stores can turn them on for appointments.</p>
          </div>
          {sheet === "returns" && <ReturnsSheet settings={s} onClose={() => setSheet(null)} onSave={persist} />}
          {sheet === "delivery" && <DeliverySheet settings={s} onClose={() => setSheet(null)} onSave={persist} />}
        </>
      )}
      {toast}
    </BizPage>
  );
}

const WINDOW_OPTIONS: { value: string; label: string }[] = [
  ...RETURN_WINDOWS.map((w) => ({ value: String(w), label: `${w} days` })),
  { value: "none", label: "No returns" },
];
const CONDITION_OPTIONS: { value: ReturnCondition; label: string }[] = [
  { value: "unopened", label: "Unopened items only" },
  { value: "any", label: "Any condition" },
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
    <BizSheet open onClose={onClose} title="Returns" lead="What customers can send back, and for how long.">
      <BizFieldButton
        id="ret-window"
        label="Return window"
        value={win === "none" ? "No returns" : `${win} days`}
        icon={open === "win" ? ChevronUp : ChevronDown}
        expanded={open === "win"}
        onClick={() => setOpen(open === "win" ? null : "win")}
      />
      {open === "win" && (
        <BizDropdown
          label="Return window"
          options={WINDOW_OPTIONS}
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
            label="Condition"
            value={CONDITION_OPTIONS.find((c) => c.value === cond)?.label}
            icon={open === "cond" ? ChevronUp : ChevronDown}
            expanded={open === "cond"}
            onClick={() => setOpen(open === "cond" ? null : "cond")}
          />
          {open === "cond" && (
            <BizDropdown
              label="Condition"
              options={CONDITION_OPTIONS}
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
        <BizRow title="Allow exchanges" toggle={{ checked: ex && win !== "none", onChange: setEx, disabled: win === "none" }} />
      </div>
      {error && <p role="alert" className="text-[12px] font-bold text-status-high">{error}</p>}
      <BizButton
        label="Save"
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
    <BizSheet open onClose={onClose} title="Delivery" lead="Only shown when you deliver.">
      <div className={LIST_BG} style={{ borderRadius: 18, padding: "4px 0", marginBottom: 12 }}>
        <BizRow title="Offer delivery" toggle={{ checked: on, onChange: setOn }} />
      </div>
      {on && (
        <>
          <BizField id="del-fee" label="Delivery fee ($)" value={fee} onChange={setFee} inputMode="decimal" placeholder="0" />
          <BizField id="del-over" label="Free delivery over ($)" value={over} onChange={setOver} inputMode="decimal" placeholder="Optional" />
          <BizFieldButton
            id="del-time"
            label="Delivery time"
            value={time || "Choose"}
            placeholder={!time}
            icon={timeOpen ? ChevronUp : ChevronDown}
            expanded={timeOpen}
            onClick={() => setTimeOpen((o) => !o)}
          />
          {timeOpen && (
            <BizDropdown
              label="Delivery time"
              options={DELIVERY_TIMES.map((t) => ({ value: t, label: t }))}
              value={time}
              onPick={(v) => {
                setTime(v);
                setTimeOpen(false);
              }}
            />
          )}
        </>
      )}
      {(error || bad) && <p role="alert" className="text-[12px] font-bold text-status-high">{error ?? "Use amounts like 3 or 2.50."}</p>}
      <BizButton
        label="Save"
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

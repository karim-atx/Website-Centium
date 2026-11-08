import { useCallback, useEffect, useState, type FC, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  Banknote,
  Bell,
  Check,
  CalendarRange,
  CalendarX,
  ClipboardList,
  Clock,
  Dumbbell,
  FlaskConical,
  Globe2,
  HeartPulse,
  Ruler,
  Scale,
  Timer,
  UserX,
  Users,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../../components/ui/SettingsRows";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { useApp } from "../../../context/AppContext";
import { ListSkeleton, OfflineLine, ProError } from "../../../components/pro/states";
import { INK } from "../../../components/pro/proInk";
import { AUDIENCE, BookingSheet, windowLabel, type BookingSheetKind } from "../../../components/pro/calendar/BookingSheets";
import { remindersLabel, type AlertValue } from "../../../components/pro/calendar/calendarModel";
import {
  DEFAULT_POLICY,
  fetchBookingPolicy,
  fetchMyHandle,
  fetchReminderDefaults,
  saveBookingPolicy,
  type BookingPolicy,
} from "../../../services/pro/calendar";
import {
  fetchPracticeSettings,
  saveDataRequests,
  saveInvoiceDetails,
  type AccessCategory,
  type InvoiceDetails,
} from "../../../services/pro/practice";
import { DobInline } from "../../../components/profile/DobInline";
import { fetchMyProfile, listingNeedsDateOfBirth, NEEDS_DOB, setPublicListing, type ProfessionalProfile } from "../../../services/professional-profile";
import { fetchGoLiveStatus } from "../../../services/professional-onboarding";
import { isRegulated, proKindOf } from "../../onboarding/pro/proModel";
import type { LicenceStatus } from "../../../services/professional-cv";
import { textPx } from "../../../theme/textSize";
import { SettingsRowVariant } from "../../../components/ui/settingsRowVariant";
import { usePaneSpan } from "../../../components/web/paneFill";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t, tk, tn } from "../../../i18n/core";

/**
 * Release 3 W6 · Settings › Practice (/app/more/practice/*), MO23 v3
 * (source/gen r16.js bookingDefaults16, dataRequests16) and the two rows the
 * frames don't open (Invoice details; Public listing, moved here from
 * the old listing sheet by FINAL_PLAN W6).
 */
export default function PracticeSettings() {
  return (
    <Routes>
      <Route path="booking-defaults" element={<BookingDefaults />} />
      <Route path="data-requests" element={<DataRequests />} />
      <Route path="invoice" element={<InvoicePage />} />
      <Route path="listing" element={<ListingPage />} />
      <Route path="*" element={<Navigate to="/app/settings" replace />} />
    </Routes>
  );
}

const Note = ({ children }: { children: ReactNode }) =>
  usePaneSpan() ? (
    <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{children}</p>
  ) : (
    <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 12 }}>{children}</p>
  );

/**
 * Website viewport (Professional handover v1, WP-MO.10; WP-MO Practice
 * Settings Web): in the spanning Settings pane each page takes the Practice
 * kicker (13/20 caps) over its title 28/36 and the intro 15/24, 24 above the
 * first section, and its sections and rows the pane sizes. Mobile: the
 * PageHeader as before.
 */
const PracticeHead: FC<{ title: string; intro?: string }> = ({ title, intro }) =>
  usePaneSpan() ? (
    <div style={{ marginBottom: 24 }}>
      <p className="rtl:tracking-normal" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#71685E" }}>{t("Practice")}</p>
      <h2 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>{title}</h2>
      {intro && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{intro}</p>}
    </div>
  ) : (
    <PageHeader title={title} showBack tightBack />
  );

/** The pane row sizes for the page inside the spanning Settings pane; nothing below 1024. */
const PaneRows: FC<{ children: ReactNode }> = ({ children }) =>
  usePaneSpan() ? <SettingsRowVariant.Provider value="pane">{children}</SettingsRowVariant.Provider> : <>{children}</>;

// ---------------------------------------------------------------------------
// Booking defaults (MO23 v3): the practice-wide booking policy
// (professional_booking_policies) and the two default reminders
// (practice_settings), the same rows W4's Calendar › Availability writes, in
// the frame's three groups. Each row opens W4's sheet for that policy.
// ---------------------------------------------------------------------------

const hours = (h: number) =>
  h === 0 ? t("No notice") : h % 24 === 0 && h >= 48 ? tn(h / 24, "{n} days", "{n} days") : tn(h, "{n} hour", "{n} hours");
const charge = (p: number) =>
  p === 0 ? t("No charge") : p === 50 ? t("Half the session price") : p === 100 ? t("Full session price") : t("{pct}% of the session price", { pct: p });

function BookingDefaults() {
  const navigate = useNavigate();
  const { authUserId: me } = useApp();
  const [policy, setPolicy] = useState<BookingPolicy | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [reminders, setReminders] = useState<{ alert: AlertValue; alert2: AlertValue }>({ alert: "hour_1", alert2: "none" });
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [sheet, setSheet] = useState<BookingSheetKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const [po, ha, re] = await Promise.all([fetchBookingPolicy(me), fetchMyHandle(me), fetchReminderDefaults(me)]);
    if (po.ok) setPolicy(po.data);
    if (ha.ok) setHandle(ha.data);
    if (re.ok) setReminders({ alert: re.data.alert as AlertValue, alert2: re.data.alert2 as AlertValue });
    setState(po.ok && re.ok ? "ok" : !po.ok && po.offline ? "offline" : "error");
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCharge = async (key: "lateCancelPct" | "noShowPct", on: boolean) => {
    if (!me || !policy) return;
    const next = { ...policy, [key]: on ? (key === "lateCancelPct" ? 50 : 100) : 0 };
    setPolicy(next);
    const r = await saveBookingPolicy(me, next);
    if (!r.ok) {
      setPolicy(policy);
      setToast(t(r.message));
    }
  };

  const p = policy ?? DEFAULT_POLICY;
  return (
    <PaneRows>
    <div>
      <PracticeHead title={t("Booking defaults")} />
      <SettingsBody className="-mt-3">
        {state === "loading" && !policy ? (
          <ListSkeleton rows={4} />
        ) : state === "error" && !policy ? (
          <ProError onRetry={() => void load()} />
        ) : (
          <>
            {state === "offline" && <OfflineLine />}
            <SettingsSection label={t("New bookings")}>
              <SettingsRow icon={Clock} title={t("Minimum notice")} value={hours(p.minNoticeHours)} onClick={() => setSheet("notice")} />
              <SettingsRow icon={CalendarRange} title={t("How far ahead")} value={t(windowLabel(p.windowDays).replace(" ahead", ""))} onClick={() => setSheet("window")} />
              <SettingsRow icon={Timer} title={t("Buffer between sessions")} subtitle={t("Set on each session type")} onClick={() => navigate("/app/pro/calendar/availability")} paneExternal />
              <SettingsRow icon={Users} title={t("Who can book")} value={t(AUDIENCE[p.whoCanBook].title)} onClick={() => setSheet("who")} />
            </SettingsSection>
            <SettingsSection label={t("Changes and cancellations")}>
              <SettingsRow icon={CalendarX} title={t("Free cancellation")} value={p.freeCancelHours === 0 ? t("Up to the start") : t("{n} h before", { n: p.freeCancelHours })} onClick={() => setSheet("notice")} />
              <SettingsRow
                icon={Banknote}
                title={t("Charge late cancellations")}
                subtitle={charge(p.lateCancelPct)}
                toggle={{ checked: p.lateCancelPct > 0, onChange: (v) => void setCharge("lateCancelPct", v), disabled: !policy, label: t("Charge late cancellations") }}
              />
              <SettingsRow
                icon={UserX}
                title={t("Charge no-shows")}
                subtitle={charge(p.noShowPct)}
                toggle={{ checked: p.noShowPct > 0, onChange: (v) => void setCharge("noShowPct", v), disabled: !policy, label: t("Charge no-shows") }}
              />
            </SettingsSection>
            <SettingsSection label={t("Reminders to clients")}>
              <SettingsRow icon={Bell} title={t("Before a session")} value={t(remindersLabel(reminders.alert, reminders.alert2))} onClick={() => setSheet("reminders")} />
            </SettingsSection>
            <Note>{t("These apply to every new session type. You can change them on a single session type in Calendar.")}</Note>
          </>
        )}
      </SettingsBody>
      {me && (
        <BookingSheet kind={sheet} me={me} policy={p} handle={handle} reminders={reminders} onClose={() => setSheet(null)} onSaved={() => void load()} onToast={setToast} />
      )}
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </div>
    </PaneRows>
  );
}

// ---------------------------------------------------------------------------
// Default data requests (MO23 v3, dataRequests16): the nine categories in the
// frame's order; access_category values from Database DB-2.
// ---------------------------------------------------------------------------

const CATS: { key: AccessCategory; icon: LucideIcon; label: string }[] = [
  { key: "workout_activity", icon: Dumbbell, label: tk("Workout activity") },
  { key: "food_diary", icon: UtensilsCrossed, label: tk("Food diary") },
  { key: "weight", icon: Scale, label: tk("Weight") },
  { key: "body_measurements", icon: Ruler, label: tk("Body measurements") },
  { key: "health_metrics", icon: Activity, label: tk("Activity & vitals") },
  { key: "blood_pressure", icon: HeartPulse, label: tk("Blood pressure") },
  { key: "lab_results", icon: FlaskConical, label: tk("Lab results") },
  { key: "medical_history", icon: ClipboardList, label: tk("Medical history") },
  { key: "allergies_dietary", icon: Wheat, label: tk("Allergies and dietary needs") },
];

function DataRequests() {
  const { authUserId: me } = useApp();
  const [cats, setCats] = useState<AccessCategory[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const r = await fetchPracticeSettings(me);
    if (r.ok) {
      setCats(r.data.dataRequests);
      setState("ok");
    } else setState(r.offline ? "offline" : "error");
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);

  const flip = async (key: AccessCategory, on: boolean) => {
    if (!me || !cats) return;
    const prev = cats;
    // Keeps any category this screen doesn't draw (habits, progress, ...).
    const next = on ? [...cats.filter((c) => c !== key), key] : cats.filter((c) => c !== key);
    setCats(next);
    const r = await saveDataRequests(me, next);
    if (!r.ok) {
      setCats(prev);
      setToast(r.message);
    }
  };

  const pane = usePaneSpan();
  const intro = t("Asked of every new client when they hire you. Each client chooses what to share and can change it any time.");
  return (
    <PaneRows>
    <div>
      <PracticeHead title={t("Default data requests")} intro={pane ? intro : undefined} />
      <SettingsBody className="-mt-3">
        {!pane && (
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 8 }}>
          {intro}
        </p>
        )}
        {state === "loading" ? (
          <ListSkeleton rows={5} />
        ) : !cats ? (
          state === "offline" ? <OfflineLine /> : <ProError onRetry={() => void load()} />
        ) : (
          <SettingsSection label={t("Ask new clients for")}>
            {CATS.map((c) => (
              <SettingsRow key={c.key} icon={c.icon} title={t(c.label)} toggle={{ checked: cats.includes(c.key), onChange: (v) => void flip(c.key, v), label: t(c.label) }} />
            ))}
          </SettingsSection>
        )}
        <Note>{t("Asking only for what you use builds trust. Clients see why you ask for each one.")}</Note>
      </SettingsBody>
      <Toast open={!!toast} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </div>
    </PaneRows>
  );
}

// ---------------------------------------------------------------------------
// Invoice details: no frame opens this row; the row's own subtitle names the
// three fields (name on invoices, tax number, numbering). No invoices are
// issued in the app yet (payments are out of scope), so these are kept for
// when they are.
// ---------------------------------------------------------------------------

function InvoicePage() {
  const { authUserId: me } = useApp();
  const [draft, setDraft] = useState<InvoiceDetails | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pane = usePaneSpan();
  const { rail } = useWebLayout();

  const load = useCallback(async () => {
    if (!me) return;
    const r = await fetchPracticeSettings(me);
    if (r.ok) {
      setDraft(r.data.invoice);
      setState("ok");
    } else setState(r.offline ? "offline" : "error");
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!me || !draft) return;
    setSaving(true);
    const r = await saveInvoiceDetails(me, draft);
    setSaving(false);
    setMsg(r.ok ? "Saved" : r.message);
  };

  const paneField = (key: keyof InvoiceDetails, label: string, placeholder: string, max: number, span: string) => (
    <label className="block" key={key} style={{ gridColumn: span }}>
      <span className="block" style={{ marginBottom: 8, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5B5349" }}>
        {label}
      </span>
      <input
        value={draft?.[key] ?? ""}
        maxLength={max}
        onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
        placeholder={placeholder}
        className="w-full outline-none placeholder:text-[#9A94B3] focus:border-[#AEA1DC]"
        style={{ height: 44, boxSizing: "border-box", borderRadius: 12, background: "#F7F7FC", border: "1px solid rgba(36,31,27,0.10)", padding: "0 14px", fontSize: 15, lineHeight: "24px", color: "#241F1B" }}
      />
    </label>
  );

  const field = (key: keyof InvoiceDetails, label: string, placeholder: string, max: number) => (
    <label className="block" key={key}>
      <span className="block mb-1.5 text-charcoal-soft" style={{ fontSize: textPx(12), fontWeight: 600 }}>
        {label}
      </span>
      <input
        value={draft?.[key] ?? ""}
        maxLength={max}
        onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
        placeholder={placeholder}
        className="w-full min-h-[44px] rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );

  // WP-MO.10 invoice (web pane): the fields 2 across (1 on the rail; the name spans the row), labels 13/20 700, inputs 44 r12 #F7F7FC 15/24; Save 44 r14 at the end.
  if (pane)
    return (
      <div>
        <PracticeHead title={t("Invoice details")} />
        {state === "loading" ? (
          <ListSkeleton rows={3} />
        ) : !draft ? (
          state === "offline" ? <OfflineLine /> : <ProError onRetry={() => void load()} />
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: "16px 24px" }}>
              {paneField("name", t("Name on invoices"), t("Your name or business name"), 120, "1 / -1")}
              {paneField("taxNumber", t("Tax number"), t("Optional"), 40, "auto")}
              {paneField("prefix", t("Invoice numbering"), t("Prefix, for example INV-"), 10, "auto")}
            </div>
            <Note>{t("Shown on invoices and receipts once payments in the app launch.")}</Note>
            {msg && (
              <p role="status" style={{ margin: "12px 0 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: msg === "Saved" ? "#1D744A" : "#B3261E" }}>
                {t(msg)}
              </p>
            )}
            <div className="flex justify-end" style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="flex items-center justify-center hover:bg-[#8E7FD0] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
                style={{ height: 44, minWidth: 160, padding: "0 24px", boxSizing: "border-box", borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
              >
                <Check size={18} aria-hidden />
                {saving ? t("Saving…") : t("Save")}
              </button>
            </div>
          </>
        )}
      </div>
    );

  return (
    <div>
      <PageHeader title={t("Invoice details")} showBack tightBack />
      {state === "loading" ? (
        <ListSkeleton rows={3} />
      ) : !draft ? (
        state === "offline" ? <OfflineLine /> : <ProError onRetry={() => void load()} />
      ) : (
        <div className="space-y-4">
          {field("name", t("Name on invoices"), t("Your name or business name"), 120)}
          {field("taxNumber", t("Tax number"), t("Optional"), 40)}
          {field("prefix", t("Invoice numbering"), t("Prefix, for example INV-"), 10)}
          <Note>{t("Shown on invoices and receipts once payments in the app launch.")}</Note>
          {msg && (
            <p role="status" style={{ fontSize: textPx(12), fontWeight: 600, color: msg === "Saved" ? INK.good : INK.hi }}>
              {t(msg)}
            </p>
          )}
          <Button fullWidth onClick={() => void save()} disabled={saving}>
            {saving ? t("Saving…") : t("Save")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public listing: the switch from the old listing sheet, unchanged in
// behaviour (set_public_listing; ATX08 no profile, ATX47, ATX48 date of
// birth, ATXC6 verification). Database #38 retired the affiliation refusal
// (ATX03): every Team professional stays listed and keeps their own switch.
// The profile fields it used to carry are on Edit public profile (MO14); the
// map area is on Where you work.
// ---------------------------------------------------------------------------

function ListingPage() {
  const navigate = useNavigate();
  const { authUserId, user } = useApp();
  const regulated = isRegulated(proKindOf(user.professionalSubtype));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [check, setCheck] = useState<LicenceStatus | null>(null);
  const [needsDob, setNeedsDob] = useState(false);
  const [dobAsk, setDobAsk] = useState<null | { retry: () => void }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authUserId) return;
    setLoading(true);
    setLoadError(null);
    const result = await fetchMyProfile(authUserId);
    if (!result.ok) {
      setLoadError(result.message);
      setLoading(false);
      return;
    }
    setProfile(result.profile);
    const [goLive, dob] = await Promise.all([fetchGoLiveStatus(authUserId, regulated), listingNeedsDateOfBirth()]);
    setCheck(goLive.ok ? goLive.status : null);
    setNeedsDob(dob);
    setLoading(false);
  }, [authUserId, regulated]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await setPublicListing(next);
    setBusy(false);
    if (r.status === "ok") return setProfile((p) => (p ? { ...p, listedPublicly: r.listed } : p));
    if (r.status === "no_profile") return setError(t("Fill in your public profile first. There's nothing to list yet."));
    if (r.status === "needs_dob") return setDobAsk({ retry: () => void toggle(true) });
    if (r.status === "needs_verification") return setCheck((c) => (c?.kind === "verified" ? { kind: "none" } : c));
    setError(t(r.message));
  };

  const listed = profile?.listedPublicly ?? false;
  const verified = check?.kind === "verified";
  const waiting = !listed && !verified;
  // One key per document word: Arabic needs the noun inside the sentence.
  const waitingLine =
    check?.kind === "pending"
      ? regulated
        ? t("We're checking your licence. You can be listed once it's verified.")
        : t("We're checking your certificate. You can be listed once it's verified.")
      : check?.kind === "rejected"
        ? regulated
          ? t("We couldn't verify your licence. Fix it in Edit public profile to be listed.")
          : t("We couldn't verify your certificate. Fix it in Edit public profile to be listed.")
        : regulated
          ? t("Add your licence in Edit public profile. You can be listed once we've checked it.")
          : t("Add your certificate in Edit public profile. You can be listed once we've checked it.");

  const pane = usePaneSpan();
  const intro = t("Clients browsing Explore can find you once you're listed. Your public profile is what they see.");
  return (
    <PaneRows>
    <div>
      <PracticeHead title={t("Public listing")} intro={pane ? intro : undefined} />
      <SettingsBody className="-mt-3">
        {!pane && (
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 8 }}>
          {intro}
        </p>
        )}
        {loading ? (
          <ListSkeleton rows={2} />
        ) : loadError ? (
          <ProError onRetry={() => void load()} message={t(loadError)} />
        ) : (
          <SettingsSection label={t("Explore")}>
            <SettingsRow
              icon={Globe2}
              title={t("Show me in Explore")}
              subtitle={
                profile
                  ? listed
                    ? t("Clients browsing Explore can find you.")
                    : waiting
                      ? waitingLine
                      : t("You're not listed. Only clients with your code or invite link can connect.")
                  : t("Fill in your public profile first. There's nothing to list yet.")
              }
              toggle={{ checked: listed, onChange: (v) => void toggle(v), disabled: !profile || busy || waiting, label: t("Show me in Explore") }}
            />
            <SettingsRow icon={Globe2} title={t("Edit public profile")} onClick={() => navigate("/app/more/edit-profile")} paneExternal />
          </SettingsSection>
        )}
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
            {error}
          </p>
        )}
        <div className="mt-4">
          {dobAsk ? (
            <DobInline
              title={t("Add your date of birth")}
              body={`${t(NEEDS_DOB)} ${t("It's kept private: clients never see it.")}`}
              onSaved={() => {
                const retry = dobAsk.retry;
                setDobAsk(null);
                setNeedsDob(false);
                retry();
              }}
            />
          ) : (
            needsDob && (
              <DobInline
                title={t("Add your date of birth to stay fully listed")}
                body={t("You're listed and you stay listed. Until you add your date of birth you can't add a map area, and if you turn your listing off you won't be able to turn it back on. It's kept private: clients never see it.")}
                onSaved={() => setNeedsDob(false)}
              />
            )
          )}
        </div>
      </SettingsBody>
    </div>
    </PaneRows>
  );
}

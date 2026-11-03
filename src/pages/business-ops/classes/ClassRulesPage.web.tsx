import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, Info, Plus, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { Toast } from "../../../components/ui/Toast";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { fetchVenueCancellationDefault } from "../../../services/business-classes";
import { fetchBookingPolicies, setBookingPolicy } from "../../../services/business-classes/schedule";
import { effectiveRules, policyFor, POLICY_FALLBACK, type BookingPolicy, type PolicyField } from "../../../services/business-classes/scheduleRules";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { PremiumBookingSetting } from "../../../components/premium/PremiumBooking";
import { WebPageHeader } from "../../../components/web/WebPageHeader";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { useSchedule } from "./useSchedule";
import { todayIso } from "./scheduleModel";
import { getLanguage, t, tk, tn } from "../../../i18n/core";

// Website viewport v1 · WB-CS-SC.8 Class rules (WB-CS Class Rules Web v2;
// Karim's decision 7): the mobile rule cards as one table, a row per class
// type (min 64) and the tinted "Other class types" row last with its note.
// Columns Class · Waitlist (switch) · Waitlist size · Late cancel, the two
// pickers as anchored menus at the trigger's width. Reading, saving and the
// precedence are the mobile ClassRulesPage's (B9, CL-05), unchanged.

const SIZES = [3, 5, 10, 20];
const LATE = [2, 4, 6, 12, 24, 48];
const hoursBefore = (h: number): string => (h === 0 ? t("Until class time") : tn(h, "{n} hour before", "{n} hours before"));

const CAPS: React.CSSProperties = { fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7D6BB5" };
const SUBHEAD: React.CSSProperties = { fontSize: 13, lineHeight: "20px", color: "#8C8378", textTransform: "none", letterSpacing: 0, fontWeight: 400 };

const Switch: React.FC<{ checked: boolean; label: string; disabled: boolean; onChange: (v: boolean) => void }> = ({ checked, label, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="relative shrink-0 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
    style={{ width: 42, height: 26, borderRadius: 999, background: checked ? "#AEA1DC" : "#D9D6E3", transition: "background-color .15s" }}
  >
    <span
      aria-hidden
      className="absolute"
      style={{ top: 2, insetInlineStart: checked ? 18 : 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "inset-inline-start .15s" }}
    />
  </button>
);

const Picker: React.FC<{ value: string; aria: string; minW: number; disabled: boolean; off?: boolean; offTitle?: string; onOpen: (el: HTMLButtonElement) => void }> = ({
  value,
  aria,
  minW,
  disabled,
  off,
  offTitle,
  onOpen,
}) =>
  off ? (
    <span
      aria-disabled="true"
      title={offTitle}
      className="inline-flex items-center justify-between whitespace-nowrap"
      style={{ minHeight: 40, boxSizing: "border-box", paddingInline: "12px 10px", borderRadius: 12, border: "1px solid rgba(36,31,27,0.06)", gap: 6, minWidth: minW, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#B8B2AB", background: "#F7F7F8" }}
    >
      –
      <ChevronDown size={16} style={{ color: "#D2CDC7" }} aria-hidden />
    </span>
  ) : (
    <button
      type="button"
      aria-haspopup="menu"
      aria-label={aria}
      disabled={disabled}
      onClick={(e) => onOpen(e.currentTarget)}
      className="inline-flex items-center justify-between whitespace-nowrap bg-white hover:border-[#AEA1DC] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
      style={{ minHeight: 40, boxSizing: "border-box", paddingInline: "12px 10px", borderRadius: 12, border: "1px solid rgba(36,31,27,0.11)", gap: 6, minWidth: minW, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}
    >
      {value}
      <ChevronDown size={16} style={{ color: "#8C8378" }} aria-hidden />
    </button>
  );

export default function ClassRulesPageWeb() {
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const api = useSchedule();
  const access = useConsoleAccess();
  const canWrite = access.ready ? access.meets("schedule") : false;
  const [venueDefault, setVenueDefault] = useState<number | null | undefined>(undefined);
  const [policies, setPolicies] = useState<BookingPolicy[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ m: string; k: number } | null>(null);
  const [menu, setMenu] = useState<{ type: string | null; which: "size" | "late"; el: HTMLButtonElement; cap: number; late: number; title: string } | null>(null);
  const today = todayIso();
  const clients = api.people === "clients";
  const lead = clients ? t("Waitlist and late cancels for each class type. Clients see these when they book.") : t("Waitlist and late cancels for each class type. Members see these when they book.");

  useEffect(() => {
    if (!api.businessId) return;
    let alive = true;
    void Promise.all([fetchVenueCancellationDefault(api.businessId), fetchBookingPolicies(api.businessId)]).then(([h, p]) => {
      if (!alive) return;
      setVenueDefault(h);
      if (p.ok) {
        setPolicies(p.value);
        setLoadError(false);
      } else setLoadError(true);
    });
    return () => {
      alive = false;
    };
  }, [api.businessId, tick]);

  // The mobile page's save, unchanged: optimistic, flips back on failure.
  const save = useCallback(
    async (classType: string | null, field: PolicyField, value: number | null) => {
      if (!api.businessId || !policies) return;
      const key = `${classType ?? ""}|${field}`;
      const before = policies;
      const existing = policyFor(policies, classType);
      const draft: BookingPolicy = existing
        ? { ...existing, [field]: value }
        : { id: `new-${key}`, classType, cancellationHours: null, bookingWindowDays: null, closesMinutesBefore: null, defaultCapacity: null, waitlistCap: null, [field]: value };
      setPolicies([...policies.filter((p) => p !== existing), draft]);
      setSaving(key);
      const r = await setBookingPolicy(api.businessId, existing, classType, field, value);
      setSaving(null);
      if (!r.ok) {
        setPolicies(before);
        setToast({ m: t("Couldn't save. Try again."), k: Date.now() });
        return;
      }
      setPolicies((cur) => [...(cur ?? []).filter((p) => p.id !== draft.id && p.id !== r.value.id), r.value]);
      setToast({ m: t("Rules saved."), k: Date.now() });
    },
    [api.businessId, policies]
  );

  const venueHours = venueDefault ?? null;
  const upcoming = api.classes.filter((r) => r.date >= today && !r.cancelledAt);
  const typeKey = (s: string) => s.trim().toLowerCase();
  const types: string[] = [];
  for (const s of [...upcoming.map((r) => r.classType).filter(Boolean), ...(policies ?? []).map((p) => p.classType).filter((s): s is string => !!s)])
    if (!types.some((x) => typeKey(x) === typeKey(s))) types.push(s);
  types.sort((a, b) => a.localeCompare(b));
  const loading = (api.loading && api.loadedAt === null) || (!policies && !loadError);
  const def = policies ? effectiveRules(policies, null, venueHours) : null;
  const disabled = !canWrite || !api.online;
  const noClasses = api.classes.length === 0 && types.length === 0;

  const cols = rail ? "30fr 23.33fr 23.33fr 23.33fr" : "34fr 22fr 22fr 22fr";
  const sizeW = rail ? 104 : 120;
  const lateW = rail ? 148 : 168;

  const rows: { key: string; type: string | null; title: string; note?: string; cap: number; late: number }[] = types.map((type) => {
    const eff = effectiveRules(policies ?? [], type, venueHours);
    return { key: typeKey(type), type, title: type, cap: eff.waitlistCap, late: eff.cancellationHours };
  });
  if (def) {
    const late = getLanguage() === "en" ? hoursBefore(def.cancellationHours).toLowerCase() : hoursBefore(def.cancellationHours);
    rows.push({
      key: "",
      type: null,
      title: types.length ? t("Other class types") : t("Every class type"),
      note:
        def.waitlistCap === 0
          ? t("Class types without their own rules use these: no waitlist, {late}.", { late })
          : t("Class types without their own rules use these: a waitlist of up to {n}, {late}.", { n: def.waitlistCap, late }),
      cap: def.waitlistCap,
      late: def.cancellationHours,
    });
  }

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/classes"));

  return (
    <div>
      <div className="sticky top-0 z-30">
        <WebPageHeader
          kicker={api.kind === "classes" ? t("Schedule") : t("Classes")}
          title={t("Class rules")}
          back={{ to: "/app/business/classes", label: tk("Back to Schedule"), square: true, onClick: back }}
        />
      </div>
      <div className="max-w-[1344px] flex flex-col" style={{ padding: 32, gap: 16, boxSizing: "border-box" }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{lead}</p>
        {access.ready && !canWrite && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("Only staff who manage the schedule can change these.")}</p>}
        {!api.online && <MarketOffline loaded />}
        {api.businessId && <PremiumBookingSetting businessId={api.businessId} canWrite={canWrite && api.online} />}
        {loading ? (
          <MarketSkeleton radius={20} rows={3} count={2} gap={12} label={t("Loading your class rules")} />
        ) : api.error || loadError ? (
          <MarketError
            thing={tk("your class rules")}
            onRetry={() => {
              api.reload();
              setTick((n) => n + 1);
            }}
          />
        ) : (
          <div role="table" aria-label={t("Class rules")} className="flex flex-col overflow-hidden bg-white" style={{ borderRadius: 20, border: "1px solid rgba(36,31,27,0.11)" }}>
            <div role="row" className="grid items-center" style={{ gridTemplateColumns: cols, minHeight: 64, padding: "10px 0", boxSizing: "border-box", background: "#F7F5FD", borderBottom: "1px solid #EBEAF6" }}>
              <div role="columnheader" style={{ ...CAPS, padding: "0 24px" }}>
                {t("Class")}
              </div>
              <div role="columnheader" className="text-center" style={{ padding: "0 12px" }}>
                <div style={CAPS}>{t("Waitlist")}</div>
                <div style={SUBHEAD}>{t("When the class is full")}</div>
              </div>
              <div role="columnheader" className="text-center" style={{ ...CAPS, padding: "0 12px" }}>
                {t("Waitlist size")}
              </div>
              <div role="columnheader" className="text-center" style={{ padding: "0 12px" }}>
                <div style={CAPS}>{t("Late cancel")}</div>
                <div style={SUBHEAD}>{t("Cancelling later than this loses the booking")}</div>
              </div>
            </div>
            {noClasses && (
              <div className="flex flex-col items-center justify-center text-center" style={{ gap: 8, padding: "32px 24px", borderBottom: "1px solid #EBEAF6" }}>
                <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: "#F0EDF9" }}>
                  <Settings2 size={22} style={{ color: "#7D6BB5" }} aria-hidden />
                </span>
                <p style={{ margin: "4px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{t("No classes scheduled yet")}</p>
                <p style={{ margin: 0, maxWidth: "46ch", fontSize: 15, lineHeight: "24px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>
                  {clients
                    ? t("Create your first class and clients can book it on Explore. Until then, every class type uses the rules below.")
                    : t("Create your first class and members can book it on Explore. Until then, every class type uses the rules below.")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/app/business/classes")}
                  className="inline-flex items-center whitespace-nowrap hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ marginTop: 8, height: 40, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(36,31,27,0.11)", gap: 8, padding: "0 16px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D6BB5" }}
                >
                  <Plus size={20} strokeWidth={2.4} aria-hidden />
                  {t("Add class")}
                </button>
              </div>
            )}
            {rows.map((r, i) => {
              const on = r.cap > 0;
              const busy = saving?.startsWith(`${r.type ?? ""}|`) ?? false;
              const tinted = !!r.note;
              return (
                <div
                  key={r.key || "other"}
                  role="row"
                  className={`grid items-center ${tinted ? "bg-[#FAF9FD] hover:bg-[#F5F3FB]" : "bg-white hover:bg-[#FAFAFB]"}`}
                  style={{ gridTemplateColumns: cols, minHeight: 64, padding: "8px 0", boxSizing: "border-box", borderTop: i ? "1px solid rgba(36,31,27,0.06)" : 0 }}
                >
                  <div role="cell" className="min-w-0" style={{ padding: "0 24px" }}>
                    <div title={r.title} className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                      {r.title}
                    </div>
                    {r.note && <div style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", textWrap: "pretty" } as React.CSSProperties}>{r.note}</div>}
                  </div>
                  <div role="cell" className="flex justify-center">
                    <Switch
                      checked={on}
                      label={t("Waitlist for {class}", { class: r.title })}
                      disabled={disabled || busy}
                      onChange={(v) =>
                        void save(r.type, "waitlistCap", v ? (r.type === null ? POLICY_FALLBACK.waitlistCap : def && def.waitlistCap > 0 ? def.waitlistCap : POLICY_FALLBACK.waitlistCap) : 0)
                      }
                    />
                  </div>
                  <div role="cell" className="flex justify-center min-w-0" style={{ padding: "0 12px" }}>
                    <Picker
                      off={!on}
                      offTitle={t("Turn the waitlist on to set a size")}
                      value={t("Up to {n}", { n: r.cap })}
                      aria={t("Waitlist size for {class}, up to {n}", { class: r.title, n: r.cap })}
                      minW={sizeW}
                      disabled={disabled || busy}
                      onOpen={(el) => setMenu({ type: r.type, which: "size", el, cap: r.cap, late: r.late, title: r.title })}
                    />
                  </div>
                  <div role="cell" className="flex justify-center min-w-0" style={{ padding: "0 12px" }}>
                    <Picker
                      value={hoursBefore(r.late)}
                      aria={t("Late cancel for {class}, {late}", { class: r.title, late: hoursBefore(r.late) })}
                      minW={lateW}
                      disabled={disabled || busy}
                      onOpen={(el) => setMenu({ type: r.type, which: "late", el, cap: r.cap, late: r.late, title: r.title })}
                    />
                  </div>
                </div>
              );
            })}
            <div role="note" className="flex items-center" style={{ gap: 10, padding: "12px 24px", background: "#F0EDF9", borderTop: "1px solid #EBEAF6" }}>
              <Info size={16} strokeWidth={2} style={{ color: "#7D6BB5", flex: "none" }} aria-hidden />
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5F5093", textWrap: "pretty" } as React.CSSProperties}>
                {clients
                  ? t("Cancelling later than the late-cancel time loses the booking. Clients see these rules when they book.")
                  : t("Cancelling later than the late-cancel time loses the booking. Members see these rules when they book.")}
              </p>
            </div>
          </div>
        )}
      </div>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        matchWidth={menu?.el ?? null}
        variant="field"
        options={
          menu?.which === "size"
            ? (SIZES.includes(menu.cap) || menu.cap === 0 ? SIZES : [...SIZES, menu.cap].sort((a, b) => a - b)).map((n) => ({ value: String(n), label: t("Up to {n}", { n }) }))
            : (menu && !LATE.includes(menu.late) ? [...LATE, menu.late].sort((a, b) => a - b) : LATE).map((h) => ({ value: String(h), label: hoursBefore(h) }))
        }
        selected={menu?.which === "size" ? String(menu?.cap) : String(menu?.late)}
        onSelect={(v) => {
          const m = menu;
          setMenu(null);
          if (!m) return;
          void save(m.type, m.which === "size" ? "waitlistCap" : "cancellationHours", Number(v));
        }}
      />
      {toast && <Toast key={toast.k} open variant="business" shape="ops" bottom={32} message={toast.m} onExpire={() => setToast(null)} />}
    </div>
  );
}

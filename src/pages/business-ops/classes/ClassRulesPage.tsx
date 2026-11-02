import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { Toast } from "../../../components/ui/Toast";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { fetchVenueCancellationDefault } from "../../../services/business-classes";
import { fetchBookingPolicies, setBookingPolicy } from "../../../services/business-classes/schedule";
import { effectiveRules, policyFor, POLICY_FALLBACK, type BookingPolicy, type PolicyField } from "../../../services/business-classes/scheduleRules";
import { linePx, textPx } from "../../../theme/textSize";
import type { MarketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { BackHeader, BoardSwitch, useMarketColours } from "./parts";
import { useSchedule } from "./useSchedule";
import { todayIso } from "./scheduleModel";
import { getLanguage, t, tk, tn } from "../../../i18n/core";

// Waitlist and late cancels (OP1-094; OpsTabsV4 view=settings), one card per
// class type (V6-160: rules per class type).
//
// B9 (CL-05): each card reads and writes that type's business_booking_policies
// row (class_type matched case-insensitively; created on the first change);
// "Other class types" is the business default row (class_type null). What a
// type gets is class_booking_rules()'s precedence: its own row, else the
// default, else (late cancel) the venue's default, else 12 hours; a waitlist
// of 5. A waitlist size of 0 is "off" (OpsTabsV4: "Members can't join a
// waitlist"). Each control saves at once (S1, OURS: optimistic; "Rules
// saved." / on failure it flips back with "Couldn't save. Try again.").
// Writing needs the `schedule` permission (the table's RLS); a seat without
// it sees the rules read-only. The picker options are OURS (S2, S3): the
// handover draws none.

const SIZES = [3, 5, 10, 20];
const LATE = [2, 4, 6, 12, 24, 48];

/** scheduleRules' hoursBefore ("12 hours before", "Until class time"), in the app's language. */
const hoursBefore = (h: number): string => (h === 0 ? t("Until class time") : tn(h, "{n} hour before", "{n} hours before"));

export default function ClassRulesPage() {
  const m = useMarketColours();
  const navigate = useNavigate();
  const api = useSchedule();
  const access = useConsoleAccess();
  const canWrite = access.ready ? access.meets("schedule") : false;
  const [venueDefault, setVenueDefault] = useState<number | null | undefined>(undefined);
  const [policies, setPolicies] = useState<BookingPolicy[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ m: string; k: number } | null>(null);
  const today = todayIso();
  const lead = api.people === "clients" ? t("Waitlist and late cancels for each class type. Clients see these when they book.") : t("Waitlist and late cancels for each class type. Members see these when they book.");

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

  const save = useCallback(
    async (classType: string | null, field: PolicyField, value: number | null) => {
      if (!api.businessId || !policies) return;
      const key = `${classType ?? ""}|${field}`;
      const before = policies;
      const existing = policyFor(policies, classType);
      // Optimistic: the new value shows at once and flips back on failure.
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
  const fromClasses = upcoming.map((r) => r.classType).filter(Boolean);
  const fromRows = (policies ?? []).map((p) => p.classType).filter((s): s is string => !!s);
  const types: string[] = [];
  for (const s of [...fromClasses, ...fromRows]) if (!types.some((x) => typeKey(x) === typeKey(s))) types.push(s);
  types.sort((a, b) => a.localeCompare(b));
  const back = api.kind === "classes" ? t("Schedule") : t("Classes");
  const loading = (api.loading && api.loadedAt === null) || (!policies && !loadError);
  const def = policies ? effectiveRules(policies, null, venueHours) : null;
  const disabled = !canWrite || !api.online;

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader m={m} eyebrow={back} title={t("Class rules")} onBack={() => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/classes"))} />
      <p style={{ margin: 0, fontSize: textPx(13), color: m.ink2 }}>{lead}</p>
      {access.ready && !canWrite && (
        <p style={{ margin: "8px 0 0", fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>{t("Only staff who manage the schedule can change these.")}</p>
      )}
      {!api.online && <MarketOffline loaded style={{ marginTop: 12 }} />}
      <div style={{ height: 14 }} aria-hidden />

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
        <>
          {types.map((type) => {
            const eff = effectiveRules(policies ?? [], type, venueHours);
            return (
              <RuleCard
                key={typeKey(type)}
                m={m}
                title={type}
                waitlistCap={eff.waitlistCap}
                lateHours={eff.cancellationHours}
                disabled={disabled}
                busy={saving?.startsWith(`${type}|`) ?? false}
                onWaitlist={(on) => void save(type, "waitlistCap", on ? (def && def.waitlistCap > 0 ? def.waitlistCap : POLICY_FALLBACK.waitlistCap) : 0)}
                onSize={(n) => void save(type, "waitlistCap", n)}
                onLate={(h) => void save(type, "cancellationHours", h)}
              />
            );
          })}
          {def && (
            <RuleCard
              m={m}
              title={types.length ? t("Other class types") : t("Every class type")}
              note={(() => {
                const late = getLanguage() === "en" ? hoursBefore(def.cancellationHours).toLowerCase() : hoursBefore(def.cancellationHours);
                return def.waitlistCap === 0
                  ? t("Class types without their own rules use these: no waitlist, {late}.", { late })
                  : t("Class types without their own rules use these: a waitlist of up to {n}, {late}.", { n: def.waitlistCap, late });
              })()}
              waitlistCap={def.waitlistCap}
              lateHours={def.cancellationHours}
              disabled={disabled}
              busy={saving?.startsWith("|") ?? false}
              onWaitlist={(on) => void save(null, "waitlistCap", on ? POLICY_FALLBACK.waitlistCap : 0)}
              onSize={(n) => void save(null, "waitlistCap", n)}
              onLate={(h) => void save(null, "cancellationHours", h)}
            />
          )}
        </>
      )}
      {toast && <Toast key={toast.k} open variant="business" shape="ops" bottom={110} message={toast.m} onExpire={() => setToast(null)} />}
    </div>
  );
}

function RuleCard({
  m,
  title,
  note,
  waitlistCap,
  lateHours,
  disabled,
  busy,
  onWaitlist,
  onSize,
  onLate,
}: {
  m: MarketPalette;
  title: string;
  note?: string;
  waitlistCap: number;
  lateHours: number;
  disabled: boolean;
  busy: boolean;
  onWaitlist: (on: boolean) => void;
  onSize: (n: number) => void;
  onLate: (h: number) => void;
}) {
  const [menu, setMenu] = useState<{ which: "size" | "late"; el: HTMLButtonElement } | null>(null);
  const on = waitlistCap > 0;
  const picker = (which: "size" | "late", value: string, aria: string) => (
    <button
      type="button"
      aria-haspopup="menu"
      aria-label={aria}
      disabled={disabled || busy}
      onClick={(e) => setMenu({ which, el: e.currentTarget })}
      className="market-focus shrink-0 inline-flex items-center whitespace-nowrap disabled:opacity-60"
      style={{ minHeight: 40, paddingBlock: "0", paddingInline: "12px 10px", borderRadius: 12, border: `1px solid ${m.border}`, gap: 5, fontSize: textPx(12), fontWeight: 800, color: m.ink }}
    >
      {value}
      <ChevronDown size={14} style={{ color: m.faint }} />
    </button>
  );
  const row = (label: string, s: string | null, right: ReactNode, first = false) => (
    <div className="flex items-center flex-wrap" style={{ gap: 10, padding: "10px 16px", borderTop: first ? "none" : `0.5px solid ${m.div}`, minHeight: 54 }}>
      <div className="flex-1 min-w-0" style={{ minWidth: 140 }}>
        <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), color: m.ink }}>{label}</p>
        {s && <p style={{ margin: 0, fontSize: textPx(11.5), lineHeight: linePx(15), color: m.faint }}>{s}</p>}
      </div>
      {right}
    </div>
  );
  const sizes = SIZES.includes(waitlistCap) || !on ? SIZES : [...SIZES, waitlistCap].sort((a, b) => a - b);
  const late = LATE.includes(lateHours) ? LATE : [...LATE, lateHours].sort((a, b) => a - b);
  return (
    <div style={{ marginBottom: 12, borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
      <p style={{ margin: 0, padding: "14px 16px 6px", fontSize: textPx(14), fontWeight: 800, color: m.ink }}>{title}</p>
      {row(
        t("Waitlist"),
        on ? t("When the class is full") : t("Members can't join a waitlist"),
        <BoardSwitch m={m} checked={on} onChange={(v) => onWaitlist(v)} disabled={disabled || busy} label={t("Waitlist for {class}", { class: title })} />,
        true
      )}
      {on && row(t("Waitlist size"), null, picker("size", t("Up to {n}", { n: waitlistCap }), t("Waitlist size for {class}, up to {n}", { class: title, n: waitlistCap })))}
      {row(t("Late cancel"), t("Cancelling later than this loses the booking"), picker("late", hoursBefore(lateHours), t("Late cancel for {class}, {late}", { class: title, late: hoursBefore(lateHours) })))}
      {note && (
        <p style={{ margin: 0, padding: "10px 16px 14px", borderTop: `0.5px solid ${m.div}`, fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint, textWrap: "pretty" }}>{note}</p>
      )}
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        options={
          menu?.which === "size"
            ? sizes.map((n) => ({ value: String(n), label: t("Up to {n}", { n }) }))
            : late.map((h) => ({ value: String(h), label: hoursBefore(h) }))
        }
        selected={menu?.which === "size" ? String(waitlistCap) : String(lateHours)}
        onSelect={(v) => {
          const which = menu?.which;
          setMenu(null);
          if (which === "size") onSize(Number(v));
          else onLate(Number(v));
        }}
        heading={menu?.which === "size" ? t("Waitlist size") : t("Late cancel")}
        width={190}
      />
    </div>
  );
}

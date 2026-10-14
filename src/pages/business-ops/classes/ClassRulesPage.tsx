import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { Toggle } from "../../../components/ui/Toggle";
import { SoonChip } from "../../../components/business-more/kit";
import { fetchVenueCancellationDefault } from "../../../services/business-classes";
import { linePx, textPx } from "../../../theme/textSize";
import { useOps, type OpsColors } from "./opsTheme";
import { BackRow, Bone, ErrorCard, OpsCard } from "./parts";
import { useSchedule } from "./useSchedule";
import { todayIso } from "./scheduleModel";

// Waitlist and late cancels (OP1-094; OpsTabsV4 view=settings), one card per
// class type (V6-160: rules per class type).
//
// WHAT IS REAL TODAY, shown as it is: a full class always offers a waitlist
// with no size limit (join_class_waitlist), and the late-cancel window is
// class_cancellation_hours() = the class's own value, else the venue's
// default, else 12 (K1 / K2). Rules per class type, a waitlist switch and a
// size limit are B9 (business_booking_policies, CL-05): until then the
// switches and pickers are shown in their real state and marked Soon.

const hoursLabel = (h: number) => `${h} ${h === 1 ? "hour" : "hours"} before`;

export default function ClassRulesPage() {
  const c = useOps();
  const api = useSchedule();
  const [venueDefault, setVenueDefault] = useState<number | null | undefined>(undefined);
  const today = todayIso();

  useEffect(() => {
    if (!api.businessId) return;
    let alive = true;
    void fetchVenueCancellationDefault(api.businessId).then((h) => alive && setVenueDefault(h));
    return () => {
      alive = false;
    };
  }, [api.businessId]);

  const fallback = venueDefault ?? 12;
  const upcoming = api.classes.filter((r) => r.date >= today);
  const types = [...new Set(upcoming.map((r) => r.classType).filter(Boolean))].sort();
  const windowFor = (type: string) => {
    const hs = [...new Set(upcoming.filter((r) => r.classType === type).map((r) => r.cancellationHours ?? fallback))];
    return hs.length === 1 ? hoursLabel(hs[0]) : "Varies by class";
  };
  const back = api.kind === "classes" ? "Schedule" : "Classes";

  return (
    <div style={{ marginTop: -2 }}>
      <BackRow c={c} label={back} to="/app/business/classes" />
      <div className="flex items-center" style={{ gap: 14 }}>
        <span className="shrink-0 flex items-center justify-center" style={{ width: 60, height: 60, borderRadius: 16, background: c.pale, color: c.pDark }}>
          <Settings2 size={26} strokeWidth={1.8} />
        </span>
        <div className="flex-1 min-w-0">
          <p style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: linePx(27), color: c.ink }}>Waitlist and late cancels</p>
          <p style={{ margin: "3px 0 0", fontSize: textPx(13), lineHeight: linePx(18), color: c.inkSoft }}>Rules for each class type</p>
          <p style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(16), color: c.faint }}>
            {api.people === "clients" ? "Clients" : "Members"} see these when they book
          </p>
        </div>
      </div>

      {/* OURS: rules per class type are B9; shown in their real state until then. */}
      <p className="flex items-center" style={{ margin: "12px 0 0", gap: 8, fontSize: textPx(11.5), lineHeight: linePx(16), color: c.faint }}>
        <SoonChip />
        Changing these rules arrives soon.
      </p>
      <div style={{ height: 18 }} aria-hidden />

      {api.loading && api.loadedAt === null ? (
        [0, 1].map((i) => (
          <OpsCard key={i} c={c} style={{ marginTop: i ? 14 : 0 }}>
            <div style={{ padding: "14px 16px" }}>
              <Bone c={c} w={90} h={12} />
              <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
                <Bone c={c} w="40%" h={11} />
                <Bone c={c} w={46} h={28} r={999} />
              </div>
            </div>
          </OpsCard>
        ))
      ) : api.error ? (
        <ErrorCard c={c} message="Couldn't load your class rules. Check your connection and try again." onRetry={api.reload} />
      ) : (
        <>
          {types.map((t) => (
            <RuleCard key={t} c={c} title={t} late={windowFor(t)} />
          ))}
          <OpsCard c={c}>
            <p style={{ margin: 0, padding: "14px 16px 6px", fontSize: textPx(14), fontWeight: 800, color: c.ink }}>{types.length ? "Other class types" : "Every class type"}</p>
            <p style={{ margin: 0, padding: "10px 16px 14px", borderTop: `1px solid ${c.divider}`, fontSize: textPx(11.5), lineHeight: linePx(16), color: c.faint, textWrap: "pretty" }}>
              {venueDefault === undefined && api.businessId ? "…" : `Class types without their own rules use the default: a waitlist when full, ${hoursLabel(fallback)}.`}
            </p>
          </OpsCard>
        </>
      )}
    </div>
  );
}

function RuleCard({ c, title, late }: { c: OpsColors; title: string; late: string }) {
  const picker = (value: string) => (
    <span
      aria-disabled="true"
      className="shrink-0 inline-flex items-center whitespace-nowrap"
      style={{ minHeight: 40, padding: "0 10px 0 12px", borderRadius: 12, border: `1px solid ${c.border}`, gap: 5, fontSize: textPx(12), fontWeight: 800, color: c.ink, opacity: 0.6 }}
    >
      {value}
      <ChevronDown size={14} style={{ color: c.faint }} />
    </span>
  );
  const row = (t: string, s: string | null, right: ReactNode, first = false) => (
    <div className="flex items-center flex-wrap" style={{ gap: 10, padding: "10px 16px", borderTop: first ? "none" : `1px solid ${c.divider}`, minHeight: 54 }}>
      <div className="flex-1 min-w-0" style={{ minWidth: 140 }}>
        <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), color: c.ink }}>{t}</p>
        {s && <p style={{ margin: 0, fontSize: textPx(11.5), lineHeight: linePx(15), color: c.faint }}>{s}</p>}
      </div>
      {right}
    </div>
  );
  return (
    <OpsCard c={c} style={{ marginBottom: 14 }}>
      <p style={{ margin: 0, padding: "14px 16px 6px", fontSize: textPx(14), fontWeight: 800, color: c.ink }}>{title}</p>
      {row("Waitlist", "When the class is full", <Toggle checked onChange={() => undefined} disabled size="business-lg" label={`Waitlist for ${title}`} />, true)}
      {row("Waitlist size", null, picker("No limit"))}
      {row("Late cancel", "Cancelling later than this loses the booking", picker(late))}
    </OpsCard>
  );
}

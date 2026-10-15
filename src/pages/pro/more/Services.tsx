import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CalendarClock, Dumbbell, Gift, Package, Phone, Plus, Repeat, Stethoscope, Video } from "lucide-react";
import { SettingsRow } from "../../../components/pro/calendar/calendarFields";
import { ComingSoonPill } from "../../../components/pro/ComingSoon";
import { CtaButton, Section, StateLine, SubPage } from "../../../components/pro/profile/kit";
import { ServiceSheet } from "../../../components/pro/profile/ServiceSheet";
import { RatesSheet } from "../../../components/pro/profile/EditSheets";
import { planLine, planPrice, priceLabel, sessionLine } from "../../../components/pro/profile/profileModel";
import { useProfileFacts } from "../../../components/pro/profile/useProfileFacts";
import { OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { PinnedSlot } from "../../../components/ui/PinnedCta";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { fetchBookingPolicy, fetchSessionTypes, DEFAULT_POLICY, type BookingAudience, type SessionType } from "../../../services/pro/calendar";
import { fetchServicePlans, type ServicePlan } from "../../../services/pro/profile";

/**
 * Release 3 · W6 MO5 Services and pricing (/app/more/services; more.js
 * services), "What clients can book and buy", with MO16 Add service:
 * - Session types: the calendar's session types (appointment_services), each
 *   opening Availability and session types (/app/pro/calendar/availability),
 *   where they are edited (CA16);
 * - Packages and plans: the hire plans (professional_plans, incl.
 *   session_count): this is the hire plans editor's More row (lead
 *   carry-over), each plan opening MO16 to edit it;
 * - Rates: the monthly and consultation rates from the old Payments sheet;
 * - Offers: no backend yet, so Coming soon;
 * - pinned "Add a service" (+, 48 r14, 16 from the edges, 96 up; the page
 *   keeps 172 below).
 */
export default function Services() {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const { facts, setFacts } = useProfileFacts();
  const [types, setTypes] = useState<SessionType[] | null>(null);
  const [plans, setPlans] = useState<ServicePlan[] | null>(null);
  const [audience, setAudience] = useState<BookingAudience>(DEFAULT_POLICY.whoCanBook);
  const [state, setState] = useState<{ error: boolean; offline: boolean }>({ error: false, offline: false });
  const [sheet, setSheet] = useState<null | { plan: ServicePlan | null }>(null);
  const [ratesOpen, setRatesOpen] = useState(false);

  const load = useCallback(async () => {
    if (!authUserId) return;
    const [t, p, pol] = await Promise.all([fetchSessionTypes(authUserId), fetchServicePlans(authUserId), fetchBookingPolicy(authUserId)]);
    if (t.ok) setTypes(t.data);
    if (p.ok) setPlans(p.data);
    if (pol.ok) setAudience(pol.data.whoCanBook);
    const bad = [t, p].find((x) => !x.ok) as { ok: false; offline: boolean } | undefined;
    setState({ error: !!bad, offline: !!bad?.offline });
  }, [authUserId]);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => live && void load());
    return () => {
      live = false;
    };
  }, [load]);

  const loading = types === null || plans === null;
  const SessionIcon = lane === "full_coaching" ? Dumbbell : lane === "clinical_overview" ? Stethoscope : CalendarClock;
  const sorted = (plans ?? []).slice().sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

  return (
    <SubPage title="Services and pricing" subtitle="What clients can book and buy" bottomPad={172}>
      {state.offline && !loading && <OfflineLine />}
      {state.error && loading ? (
        <ProError onRetry={() => void load()} />
      ) : loading ? (
        <div className="flex flex-col" style={{ gap: 12 }} role="status" aria-label="Loading">
          <ProCardSkeleton lines={4} height={200} />
          <ProCardSkeleton lines={2} height={120} />
        </div>
      ) : (
        <>
          <Section label="Session types" first>
            {types!.length === 0 && <StateLine>No session types yet. Add one so clients can book you.</StateLine>}
            {types!.map((t, i) => (
              <SettingsRow
                key={t.id}
                icon={t.locationKind === "online" ? Video : t.locationKind === "phone" ? Phone : SessionIcon}
                title={t.name}
                sub={sessionLine(t.durationMin, t.locationKind)}
                value={priceLabel(t.price, t.currency)}
                onClick={() => navigate("/app/pro/calendar/availability")}
                last={i === types!.length - 1}
              />
            ))}
          </Section>

          <Section label="Packages and plans">
            {sorted.length === 0 && <StateLine>No plans yet. Add one so clients can hire you.</StateLine>}
            {sorted.map((p, i) => (
              <SettingsRow
                key={p.id}
                icon={p.sessionCount !== null ? Package : Repeat}
                title={p.name}
                sub={p.active ? planLine(p.features, p.sessionCount) : "Not offered"}
                value={planPrice(p.price, p.billing)}
                muted={!p.active}
                onClick={() => setSheet({ plan: p })}
                last={i === sorted.length - 1}
              />
            ))}
          </Section>

          <Section label="Rates">
            <SettingsRow
              icon={Banknote}
              title="Monthly and consultation rates"
              sub={
                facts
                  ? [facts.monthlyRate != null ? `$${facts.monthlyRate}/mo` : null, facts.consultationRate != null ? `$${facts.consultationRate} a consultation` : null].filter(Boolean).join(" · ") || "Not set yet"
                  : undefined
              }
              onClick={() => setRatesOpen(true)}
              last
            />
          </Section>

          <Section label="Offers">
            <SettingsRow icon={Gift} title="Offers for new clients" value={<ComingSoonPill />} last />
          </Section>
        </>
      )}

      {!loading && (
        <PinnedSlot>
          <CtaButton label="Add a service" icon={Plus} onClick={() => setSheet({ plan: null })} full />
        </PinnedSlot>
      )}

      <ServiceSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        plan={sheet?.plan ?? null}
        plans={plans ?? []}
        audience={audience}
        onOpenAvailability={() => navigate("/app/pro/calendar/availability")}
        onSaved={(name, isNew) => {
          if (isNew) navigate("/app/more/public-profile", { state: { toast: `${name} added to your profile` } });
          else void load();
        }}
      />
      <RatesSheet
        open={ratesOpen}
        onClose={() => setRatesOpen(false)}
        monthly={facts?.monthlyRate ?? null}
        consultation={facts?.consultationRate ?? null}
        onSaved={(m, c) => setFacts((f) => (f ? { ...f, monthlyRate: m, consultationRate: c } : f))}
      />
    </SubPage>
  );
}

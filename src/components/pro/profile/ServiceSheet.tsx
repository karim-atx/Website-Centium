import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { PopupMenu } from "../../ui/PopupMenu";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { Toggle } from "../../ui/Toggle";
import { FieldButton, FieldInput, FieldLabel, wellStyle } from "../calendar/calendarFields";
import { useApp } from "../../../context/AppContext";
import { BILLING_OPTIONS, PLAN_FEATURES_MAX, PLAN_NAME_MAX, type PlanBilling } from "../../../services/hires/proLogic";
import { addSessionService, savePlan, setPlanFields, type ServicePlan } from "../../../services/pro/profile";
import type { BookingAudience } from "../../../services/pro/calendar";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { CtaButton, ErrorLine } from "./kit";
import { DURATIONS, parsePriceInput } from "./profileModel";
import { t, tk } from "../../../i18n/core";

// Release 3 · W6 MO16 Add service (r13 addService13; ui.js field, segTabs, cta):
// Name; Type (Session / Package / Programme, 36 high, 12); for a session
// Duration (a dropdown) and Price side by side (two equal columns, 12 apart),
// Location (In person / Online / At a business, 36 high, 11.5), Description,
// Who can book; footer "Add to profile" (+, sheet CTA 52 r16). 14 between.
// - Session writes a session type (appointment_services, the calendar's own
//   table); "Who can book" is the practice-wide booking setting, shown here
//   and changed in Availability. Sessions at a business are the business's to
//   set (J6), so "At a business" explains that instead of saving.
// - Package and Programme write a hire plan (professional_plans): a package
//   carries session_count; both keep the old plan editor's billing, "what's
//   included" lines (up to 10), Offered switch and order.

export type ServiceKind = "session" | "package" | "programme";

const AUDIENCE_LABEL: Record<BookingAudience, string> = {
  everyone: tk("Everyone with the link"),
  clients_only: tk("Your clients only"),
  approved_only: tk("People you approve"),
};

export const ServiceSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** A plan being edited (Package or Programme); null adds a service. */
  plan: ServicePlan | null;
  plans: ServicePlan[];
  audience: BookingAudience;
  onSaved: (name: string, isNew: boolean) => void;
  onOpenAvailability: () => void;
}> = (props) => (props.open ? <ServiceForm key={props.plan?.id ?? "new"} {...props} /> : null);

const ServiceForm: React.FC<React.ComponentProps<typeof ServiceSheet>> = ({ onClose, plan, plans, audience, onSaved, onOpenAvailability }) => {
  const { authUserId } = useApp();
  const editing = !!plan;
  const [kind, setKind] = useState<ServiceKind>(plan ? (plan.sessionCount !== null ? "package" : "programme") : "session");
  const [name, setName] = useState(plan?.name ?? "");
  const [duration, setDuration] = useState<number>(60);
  const [price, setPrice] = useState(plan ? String(plan.price) : "");
  const [where, setWhere] = useState<"in_person" | "online" | "business">("in_person");
  const [description, setDescription] = useState("");
  const [sessions, setSessions] = useState(plan?.sessionCount ? String(plan.sessionCount) : "10");
  const [billing, setBilling] = useState<PlanBilling>(plan && (["daily", "monthly", "annually"] as string[]).includes(plan.billing) ? (plan.billing as PlanBilling) : "monthly");
  const [features, setFeatures] = useState<string[]>(plan && plan.features.length ? plan.features : [""]);
  const [active, setActive] = useState(plan?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durEl, setDurEl] = useState<HTMLButtonElement | null>(null);

  const save = async () => {
    if (!authUserId || busy) return;
    setError(null);
    const p = parsePriceInput(price);
    if (p === null) return setError(t("Enter the price as a number, for example 60, or leave it empty for Free."));
    setBusy(true);
    if (kind === "session") {
      const r = await addSessionService(authUserId, { name, durationMin: duration, price: p, locationKind: where === "online" ? "online" : "in_person", description });
      setBusy(false);
      if (!r.ok) return setError(r.message);
      onSaved(name.trim(), true);
      return onClose();
    }
    const count = kind === "package" ? Number(sessions) : null;
    if (kind === "package" && (!Number.isInteger(count) || (count ?? 0) < 1)) {
      setBusy(false);
      return setError(t("Enter how many sessions the package holds."));
    }
    const position = plan ? plan.position : plans.reduce((m, x) => Math.max(m, x.position + 1), 0);
    const r = await savePlan(authUserId, plan?.id ?? null, { name, price: String(p), billing, features, active, sessionCount: count }, position);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved(r.plan.name, !editing);
    onClose();
  };

  // The old editor's reorder, kept: swap positions with the neighbour.
  const move = async (dir: -1 | 1) => {
    if (!plan || busy) return;
    const sorted = [...plans].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    const i = sorted.findIndex((x) => x.id === plan.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    setBusy(true);
    setError(null);
    const a = await setPlanFields(sorted[i].id, { position: j });
    const b = a.ok ? await setPlanFields(sorted[j].id, { position: i }) : a;
    setBusy(false);
    if (!b.ok) return setError(b.message);
    onSaved(plan.name, false);
    onClose();
  };

  const atBusiness = kind === "session" && where === "business";
  const label = (t: string) => (
    <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
      {t}
    </span>
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? t("Edit service") : t("Add service")}
      size="tall"
      footer={
        <>
          {error && <ErrorLine>{error}</ErrorLine>}
          <div style={{ marginTop: error ? 10 : 0 }}>
            <CtaButton label={editing ? t("Save") : t("Add to profile")} icon={editing ? undefined : Plus} size="sheet" onClick={() => void save()} disabled={atBusiness} busy={busy} full />
          </div>
        </>
      }
    >
      <div className="flex flex-col" style={{ gap: 14 }}>
        <FieldInput label={t("Name")} value={name} onChange={setName} maxLength={kind === "session" ? 60 : PLAN_NAME_MAX} />
        <div>
          {label(t("Type"))}
          {editing ? (
            <p style={{ fontSize: textPx(14), color: INK.ch }}>{kind === "package" ? t("Package") : t("Programme")}</p>
          ) : (
            <SegmentedTabs
              items={[
                { key: "session", label: t("Session") },
                { key: "package", label: t("Package") },
                { key: "programme", label: t("Programme") },
              ]}
              activeKey={kind}
              onChange={(k) => setKind(k as ServiceKind)}
              tabHeight={36}
              labelSize={12}
            />
          )}
        </div>

        {kind === "session" ? (
          <>
            <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
              <FieldButton label={t("Duration")} value={t("{duration} min", { duration })} open={!!durEl} ariaLabel={t("Duration, {duration} minutes", { duration })} onClick={(e) => setDurEl(e.currentTarget)} />
              <FieldInput label={t("Price")} value={price} onChange={setPrice} placeholder={t("Free")} inputMode="decimal" />
            </div>
            <PopupMenu
              open={!!durEl}
              onClose={() => setDurEl(null)}
              anchor={durEl}
              matchWidth={durEl}
              options={DURATIONS.map((d) => ({ value: String(d), label: t("{d} min", { d }) }))}
              selected={String(duration)}
              onSelect={(v) => {
                setDuration(Number(v));
                setDurEl(null);
              }}
            />
            <div>
              {label(t("Location"))}
              <SegmentedTabs
                items={[
                  { key: "in_person", label: t("In person") },
                  { key: "online", label: t("Online") },
                  { key: "business", label: t("At a business") },
                ]}
                activeKey={where}
                onChange={(k) => setWhere(k as typeof where)}
                tabHeight={36}
                labelSize={11.5}
              />
              {atBusiness && (
                <p style={{ marginTop: 8, fontSize: textPx(12), lineHeight: 1.5, color: INK.chS }}>{t("Sessions you run at a business are set by that business. Pick In person or Online for your own.")}</p>
              )}
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="svc-desc">{t("Description")}</FieldLabel>
              <input id="svc-desc" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} className="w-full outline-none" style={{ ...wellStyle(), height: 40 }} />
            </div>
            <FieldButton label={t("Who can book")} value={t(AUDIENCE_LABEL[audience])} ariaLabel={t("Who can book: {audience}. Change it in Availability", { audience: t(AUDIENCE_LABEL[audience]) })} onClick={onOpenAvailability} />
          </>
        ) : (
          <>
            <div className="grid" style={{ gridTemplateColumns: kind === "package" ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 12 }}>
              <FieldInput label={t("Price")} value={price} onChange={setPrice} placeholder={t("Free")} inputMode="decimal" />
              {kind === "package" && <FieldInput label={t("Sessions")} value={sessions} onChange={(v) => setSessions(v.replace(/\D/g, ""))} inputMode="numeric" />}
            </div>
            <div>
              {label(t("Billed"))}
              <SegmentedTabs items={BILLING_OPTIONS.map((b) => ({ key: b.value, label: b.label }))} activeKey={billing} onChange={(k) => setBilling(k as PlanBilling)} tabHeight={36} labelSize={12} />
            </div>
            <div>
              {label(t("What's included (up to {PLAN_FEATURES_MAX})", { PLAN_FEATURES_MAX }))}
              <div className="flex flex-col" style={{ gap: 8 }}>
                {features.map((f, i) => (
                  <div key={i} className="flex items-center" style={{ gap: 8 }}>
                    <input
                      value={f}
                      aria-label={t("Included {n}", { n: i + 1 })}
                      onChange={(e) => setFeatures((fs) => fs.map((x, k) => (k === i ? e.target.value : x)))}
                      className="flex-1 min-w-0 outline-none"
                      style={{ ...wellStyle(), height: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setFeatures((fs) => (fs.length > 1 ? fs.filter((_, k) => k !== i) : [""]))}
                      aria-label={t("Remove included {n}", { n: i + 1 })}
                      className="tap flex items-center justify-center shrink-0"
                      style={{ width: 36, height: 36, borderRadius: 9999, background: INK.soft, color: INK.chF }}
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              {features.length < PLAN_FEATURES_MAX && (
                <button type="button" onClick={() => setFeatures((fs) => [...fs, ""])} className="tap inline-flex items-center" style={{ gap: 4, marginTop: 8, minHeight: 36, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}>
                  <Plus size={13} strokeWidth={2.4} aria-hidden />{" "}{t("Add a line")}</button>
              )}
            </div>
            <div className="flex items-center justify-between" style={{ gap: 12 }}>
              <span className="min-w-0">
                <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{t("Offered")}</span>
                <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>{t("Clients only see plans that are switched on.")}</span>
              </span>
              <Toggle checked={active} onChange={setActive} label={t("Offered")} />
            </div>
            {editing && plans.length > 1 && (
              <div className="flex" style={{ gap: 8 }}>
                <button type="button" onClick={() => void move(-1)} disabled={busy} className="tap inline-flex items-center disabled:opacity-50" style={{ gap: 4, minHeight: 36, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
                  <ChevronUp size={14} aria-hidden />{" "}{t("Move up")}</button>
                <button type="button" onClick={() => void move(1)} disabled={busy} className="tap inline-flex items-center disabled:opacity-50" style={{ gap: 4, minHeight: 36, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
                  <ChevronDown size={14} aria-hidden />{" "}{t("Move down")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};

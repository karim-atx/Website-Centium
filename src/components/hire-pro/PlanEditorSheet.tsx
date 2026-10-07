import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import {
  createPlan,
  fetchMyPlans,
  setPlanActive,
  setPlanPosition,
  updatePlan,
  type ProPlan,
} from "../../services/hires/pro";
import {
  BILLING_OPTIONS,
  PLAN_FEATURES_MAX,
  PLAN_NAME_MAX,
  planPriceLine,
  reorderPlans,
  sortByPosition,
  type PlanDraft,
} from "../../services/hires/proLogic";

// A3: the professional's hire plans — the rows MO1.2.1.5's hire sheet lists.
//
// UNSPECIFIED BY THE HANDOVER. v5.1 draws the client's hire sheet, checkout
// and confirmed screens, and the chat cards, but no professional-side editor;
// this is built from the console's own components (BottomSheet, Card, Chip,
// Toggle, Button and PaymentsSheet's input style) and every size and colour
// here is theirs, not a frame's.
//
// Writes professional_plans directly: name, price, billing, features, active
// and position are the whole column UPDATE grant. There is no delete: a plan
// somebody has hired cannot be deleted (the hire RESTRICTs on it), and
// switching it off takes it off the hire sheet, which is what a professional
// means by removing one.

const inputClass =
  "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";

const emptyDraft = (): PlanDraft => ({ name: "", price: "", billing: "monthly", features: [""], active: true });

const draftOf = (p: ProPlan): PlanDraft => ({
  name: p.name,
  price: String(p.price),
  billing: p.billing,
  features: p.features.length > 0 ? [...p.features] : [""],
  active: p.active,
});

/**
 * Mounted only while open, so every open starts on the list with a fresh
 * read. Nothing is lost: BottomSheet renders nothing while closed anyway.
 */
export const PlanEditorSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) =>
  open ? <PlanEditor onClose={onClose} /> : null;

const PlanEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { authUserId } = useApp();
  const [plans, setPlans] = useState<ProPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** null = the list; "new" = adding; otherwise the id being edited. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchMyPlans(authUserId).then((res) => {
      if (cancelled) return;
      if (res.ok) setPlans(res.plans);
      else setListError(res.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const replace = (plan: ProPlan) =>
    setPlans((prev) => sortByPosition(prev.map((p) => (p.id === plan.id ? plan : p))));

  const startEdit = (target: ProPlan | "new") => {
    setFormError(null);
    if (target === "new") {
      setDraft(emptyDraft());
      setEditing("new");
    } else {
      setDraft(draftOf(target));
      setEditing(target.id);
    }
  };

  const save = async () => {
    if (!authUserId || saving || !editing) return;
    setSaving(true);
    setFormError(null);
    const nextPosition = plans.reduce((max, p) => Math.max(max, p.position + 1), 0);
    const res =
      editing === "new" ? await createPlan(authUserId, draft, nextPosition) : await updatePlan(editing, draft);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.message);
      return;
    }
    if (editing === "new") setPlans((prev) => sortByPosition([...prev, res.plan]));
    else replace(res.plan);
    setEditing(null);
  };

  const toggleActive = async (plan: ProPlan, active: boolean) => {
    if (busyId) return;
    setBusyId(plan.id);
    setListError(null);
    const res = await setPlanActive(plan.id, active);
    setBusyId(null);
    if (res.ok) replace(res.plan);
    else setListError(res.message);
  };

  const move = async (plan: ProPlan, direction: "up" | "down") => {
    if (busyId) return;
    const changes = reorderPlans(plans, plan.id, direction);
    if (changes.length === 0) return;
    setBusyId(plan.id);
    setListError(null);
    for (const change of changes) {
      const res = await setPlanPosition(change.id, change.position);
      if (!res.ok) {
        setListError(res.message);
        break;
      }
      replace(res.plan);
    }
    setBusyId(null);
  };

  const setFeature = (index: number, value: string) =>
    setDraft((d) => ({ ...d, features: d.features.map((f, i) => (i === index ? value : f)) }));
  const removeFeature = (index: number) =>
    setDraft((d) => {
      const features = d.features.filter((_, i) => i !== index);
      return { ...d, features: features.length > 0 ? features : [""] };
    });
  const addFeature = () =>
    setDraft((d) => (d.features.length >= PLAN_FEATURES_MAX ? d : { ...d, features: [...d.features, ""] }));

  const form = (
    <div className="space-y-5 animate-fade-slide-up">
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Plan name</span>
        <input
          value={draft.name}
          maxLength={PLAN_NAME_MAX}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Monthly coaching"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Price</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal-faint">$</span>
          <input
            inputMode="decimal"
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            placeholder="e.g. 180"
            className={inputClass}
          />
        </div>
      </label>

      <div>
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Billed</span>
        <div className="flex flex-wrap gap-2">
          {BILLING_OPTIONS.map((b) => (
            <Chip key={b.value} active={draft.billing === b.value} onClick={() => setDraft((d) => ({ ...d, billing: b.value }))}>
              {b.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
          What's included (up to {PLAN_FEATURES_MAX})
        </span>
        <div className="space-y-2">
          {draft.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={f}
                onChange={(e) => setFeature(i, e.target.value)}
                placeholder="e.g. Weekly check-in call"
                aria-label={`Feature ${i + 1}`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeFeature(i)}
                aria-label={`Remove feature ${i + 1}`}
                className="tap w-9 h-9 rounded-full bg-cream-soft text-charcoal-faint flex items-center justify-center shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        {draft.features.length < PLAN_FEATURES_MAX && (
          <button
            type="button"
            onClick={addFeature}
            className="tap inline-flex items-center gap-1.5 mt-2 text-sm font-bold text-primary-deep-text"
          >
            <Plus size={14} /> Add a feature
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-charcoal">Offered</p>
          <p className="text-xs text-charcoal-faint">Clients only see plans that are switched on.</p>
        </div>
        <Toggle checked={draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} label="Offered" />
      </div>

      {formError && (
        <p className="text-xs font-semibold text-status-high" role="alert">
          {formError}
        </p>
      )}

      <Button fullWidth onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : editing === "new" ? "Add plan" : "Save"}
      </Button>
    </div>
  );

  const list = (
    <div className="space-y-3 animate-fade-slide-up">
      <p className="text-xs text-charcoal-faint leading-relaxed">
        These are the plans clients choose from when they hire you. Prices are what you agree with
        the client; payment is in cash or Whish Money, outside Centium.
      </p>
      {loading && <p className="text-sm text-charcoal-faint text-center py-6">Loading your plans…</p>}
      {listError && (
        <p className="text-xs font-semibold text-status-high" role="alert">
          {listError}
        </p>
      )}
      {!loading && !listError && plans.length === 0 && (
        <p className="text-sm text-charcoal-faint text-center py-6">
          No plans yet. Add one so clients can hire you.
        </p>
      )}
      {plans.map((p, i) => (
        <Card key={p.id} className={p.active ? "" : "opacity-70"}>
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void move(p, "up")}
                disabled={!!busyId || i === 0}
                aria-label={`Move ${p.name} up`}
                className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => void move(p, "down")}
                disabled={!!busyId || i === plans.length - 1}
                aria-label={`Move ${p.name} down`}
                className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-charcoal truncate">{p.name}</p>
              <p className="text-xs text-charcoal-soft">{planPriceLine(p.price, p.billing)}</p>
              {p.features.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="text-[11px] text-charcoal-faint truncate">
                      · {f}
                    </li>
                  ))}
                </ul>
              )}
              {!p.active && <p className="text-[11px] font-semibold text-charcoal-faint mt-1">Not offered</p>}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Toggle
                checked={p.active}
                disabled={!!busyId}
                onChange={(v) => void toggleActive(p, v)}
                label={`Offer ${p.name}`}
              />
              <button
                type="button"
                onClick={() => startEdit(p)}
                aria-label={`Edit ${p.name}`}
                className="tap w-9 h-9 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        </Card>
      ))}
      {!loading && (
        <Button fullWidth variant="outline" onClick={() => startEdit("new")}>
          <Plus size={16} /> Add a plan
        </Button>
      )}
    </div>
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing === null ? "Hire plans" : editing === "new" ? "New plan" : "Edit plan"}
      onBack={editing !== null ? () => setEditing(null) : undefined}
    >
      {editing === null ? list : form}
    </BottomSheet>
  );
};

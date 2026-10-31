import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PopupMenu } from "../ui/PopupMenu";
import { textPx } from "../../theme/textSize";
import { saveMyAllergies } from "../../services/nutrition/client";
import { ALLERGENS, SEVERITIES, severityLabel, type Allergen, type AllergySeverity, type MyAllergy } from "../../services/nutrition/clientNutritionModel";

/**
 * Release 3 · CU15 "Allergies sheet (new)", source gen/r23.js allergySheet23:
 * the client's own `allergies` rows (the 14 regulated allergens, enum
 * `allergen`, and a severity, enum `allergy_severity`). An intro 12.5 /
 * text.secondary / 1.5 with 8 under it; one row per allergen (gap 12, a
 * 1px hairline between rows), a 20 × 20 r6 box (checked: the primary fill and
 * a Check 12 / 3; unchecked: a 2px border), the name 13.5 / 600, and for a
 * ticked allergen its severity pill (r8, 4 × 8, 11.5 / 700, status.high on its
 * pale, ChevronDown 11 / 2.2) which opens Mild / Moderate / Severe. The
 * footer is "Save allergies". Rows are 44 tall (touch target) rather than the
 * board's 38. A newly ticked allergen starts at Severe (not drawn: the safer
 * default until the client picks).
 *
 * Severity is shown only from these structured rows; food matching is the
 * database's (food_conflicts), never this sheet's.
 */
export function AllergiesSheet({
  open,
  onClose,
  userId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  initial: MyAllergy[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Map<Allergen, AllergySeverity>>(() => new Map(initial.map((a) => [a.allergen, a.severity])));
  const [menu, setMenu] = useState<{ allergen: Allergen; anchor: HTMLElement } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (a: Allergen) =>
    setDraft((prev) => {
      const next = new Map(prev);
      if (next.has(a)) next.delete(a);
      else next.set(a, "severe");
      return next;
    });

  const save = async () => {
    if (!userId || saving) return;
    setSaving(true);
    setError(null);
    const after = [...draft.entries()].map(([allergen, severity]) => ({ allergen, severity }));
    const r = await saveMyAllergies(userId, initial, after);
    setSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Allergies"
      footer={
        <div>
          {error && (
            <p role="alert" className="text-status-high text-center" style={{ margin: "0 0 10px", fontSize: textPx(12), fontWeight: 600 }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="tap w-full inline-flex items-center justify-center disabled:opacity-60"
            style={{ height: 52, borderRadius: 16, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(15), fontWeight: 700 }}
          >
            {saving ? "Saving…" : "Save allergies"}
          </button>
        </div>
      }
    >
      <p style={{ margin: "0 0 8px", fontSize: textPx(12.5), lineHeight: 1.5, color: "rgb(var(--c-charcoal-soft))" }}>
        Pick anything you're allergic to. Foods that contain them are flagged in your diary, and professionals you share them with see them on every plan.
      </p>
      <div role="group" aria-label="Allergens">
        {ALLERGENS.map((a, i) => {
          const sev = draft.get(a.value);
          const on = !!sev;
          return (
            <div
              key={a.value}
              className="flex items-center"
              style={{ gap: 12, minHeight: 44, borderBottom: i < ALLERGENS.length - 1 ? "1px solid rgb(var(--c-charcoal) / 0.06)" : "none" }}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(a.value)}
                className="tap flex-1 min-w-0 flex items-center text-start"
                style={{ gap: 12, minHeight: 44 }}
              >
                <span
                  aria-hidden
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: on ? "rgb(var(--c-primary-fill))" : "transparent",
                    border: on ? "none" : "2px solid rgb(var(--c-charcoal) / 0.10)",
                    color: "rgb(var(--c-on-primary-fill))",
                  }}
                >
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0" style={{ fontSize: textPx(13.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
                  {a.label}
                </span>
              </button>
              {on && (
                <button
                  type="button"
                  onClick={(e) => setMenu({ allergen: a.value, anchor: e.currentTarget })}
                  aria-label={`${a.label} severity: ${severityLabel(sev)}`}
                  aria-haspopup="menu"
                  className="tap relative shrink-0 inline-flex items-center bg-status-high-bg text-status-high before:absolute before:-inset-[8px] before:content-['']"
                  style={{ gap: 3, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 700 }}
                >
                  {severityLabel(sev)}
                  <ChevronDown size={11} strokeWidth={2.2} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <PopupMenu
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={SEVERITIES}
        selected={menu ? draft.get(menu.allergen) ?? null : null}
        onSelect={(v) => {
          if (menu) setDraft((prev) => new Map(prev).set(menu.allergen, v));
          setMenu(null);
        }}
        width={140}
        align="right"
      />
    </BottomSheet>
  );
}

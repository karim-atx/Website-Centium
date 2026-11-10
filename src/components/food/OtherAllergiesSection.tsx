import { useId, useState, type CSSProperties } from "react";
import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { PopupMenu } from "../ui/PopupMenu";
import { textPx } from "../../theme/textSize";
import { SEVERITIES, severityLabel, type AllergySeverity } from "../../services/nutrition/clientNutritionModel";
import { OTHER_LABEL_MAX, OTHER_MAX, canAddOther, cleanLabel, labelProblem, otherProblemText, type OtherDraft } from "../../services/nutrition/otherAllergies";
import { t } from "../../i18n/core";

/**
 * Batch B · FQ (decisions 9 to 17, 21, 25): the Allergies sheet's "Other"
 * section, after the 14 standard allergens. Not drawn on a board: it reuses
 * the sheet's own pieces so it reads as part of it: the 44-tall rows with a
 * 1px hairline, the name 13.5 / 600, the same severity pill (r8, 4 × 8, 11.5 /
 * 700, status.high on its pale, ChevronDown 11 / 2.2) and the same Mild /
 * Moderate / Severe menu.
 *
 * Each row is the member's own allergy: the label (their words: `dir="auto"`,
 * never translated), a rename (the pencil, or a tap on the label: an inline
 * field, Enter or leaving it keeps the change, Escape drops it), the pill and
 * a remove. Under them "Add another allergy": a field held to 60 characters
 * with its counter, Enter or Add puts it in the list at Severe. "Up to 20" is
 * said, and 20/20 disables Add. Nothing is written here: the sheet's Save
 * applies these with the standard allergens. A rule broken before Save shows
 * on its field; a refusal on Save shows on its row (`rowErrors`), each with
 * role="alert".
 */
export function OtherAllergiesSection({
  rows,
  onChange,
  rowErrors,
  onBlockingChange,
}: {
  rows: OtherDraft[];
  onChange: (next: OtherDraft[]) => void;
  /** The Save's refusals, by row key. */
  rowErrors: Record<string, string>;
  /** True while a rename is open with a label that breaks a rule: Save waits. */
  onBlockingChange: (blocking: boolean) => void;
}) {
  const ids = useId();
  const headingId = `${ids}-other`;
  const [text, setText] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ key: string; value: string; error: string | null } | null>(null);
  const [menu, setMenu] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  const full = !canAddOther(rows.length);

  // Told at once (not in an effect): a Save click right after the field loses focus reads it.

  const add = () => {
    if (full) return;
    const problem = labelProblem(text, rows.map((r) => r.label));
    if (problem) return setAddError(otherProblemText(problem));
    // decision 14: a new one starts at Severe, the safer default until the member picks.
    onChange([...rows, { key: `new-${Date.now()}-${rows.length}`, id: null, label: cleanLabel(text), severity: "severe", note: null }]);
    setText("");
    setAddError(null);
  };

  const stopEditing = () => {
    setEditing(null);
    onBlockingChange(false);
  };

  /** Keeps a rename when it follows the rules; otherwise the field stays open with the rule's line. */
  const commit = (): boolean => {
    if (!editing) return true;
    const problem = labelProblem(editing.value, rows.filter((r) => r.key !== editing.key).map((r) => r.label));
    if (problem) {
      setEditing({ ...editing, error: otherProblemText(problem) });
      onBlockingChange(true);
      return false;
    }
    onChange(rows.map((r) => (r.key === editing.key ? { ...r, label: cleanLabel(editing.value) } : r)));
    stopEditing();
    return true;
  };

  const hairline = "1px solid rgb(var(--c-charcoal) / 0.06)";
  const field: CSSProperties = {
    minHeight: 44,
    borderRadius: 12,
    background: "rgb(var(--c-cream-card))",
    border: "1px solid rgb(var(--c-charcoal) / 0.10)",
    paddingInline: 12,
    fontSize: textPx(13.5),
    color: "rgb(var(--c-charcoal))",
  };
  const alert = (id: string, message: string) => (
    <p id={id} role="alert" className="text-status-high" style={{ margin: "4px 0 6px", fontSize: textPx(12), fontWeight: 600 }}>
      {message}
    </p>
  );

  return (
    <div style={{ borderTop: hairline, marginTop: 4, paddingTop: 12 }}>
      <p id={headingId} style={{ margin: 0, fontSize: textPx(13.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
        {t("Other allergies")}
      </p>
      <p style={{ margin: "2px 0 4px", fontSize: textPx(12), lineHeight: 1.5, color: "rgb(var(--c-charcoal-soft))" }}>
        {t("Add allergies that aren't listed, in your own words. Up to 20.")}
      </p>
      <div role="group" aria-labelledby={headingId}>
        {rows.map((r) => {
          const isEditing = editing?.key === r.key;
          const errId = `${ids}-${r.key}-err`;
          const rowError = isEditing ? editing.error : rowErrors[r.key] ?? null;
          return (
            <div key={r.key} style={{ borderBottom: hairline }}>
              <div className="flex items-center" style={{ gap: 8, minHeight: 44 }}>
                {isEditing ? (
                  <input
                    autoFocus
                    dir="auto"
                    value={editing.value}
                    maxLength={OTHER_LABEL_MAX}
                    aria-label={t("Rename {name}", { name: r.label })}
                    aria-invalid={!!editing.error}
                    aria-describedby={editing.error ? errId : undefined}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value, error: null })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                      } else if (e.key === "Escape") {
                        // Drops the rename; the sheet stays open.
                        e.preventDefault();
                        e.stopPropagation();
                        stopEditing();
                      }
                    }}
                    onBlur={() => commit()}
                    className="flex-1 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    style={{ ...field, fontWeight: 600 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing({ key: r.key, value: r.label, error: null })}
                    aria-label={t("Rename {name}", { name: r.label })}
                    className="tap flex-1 min-w-0 flex items-center text-start"
                    style={{ minHeight: 44 }}
                  >
                    <span dir="auto" className="min-w-0" style={{ fontSize: textPx(13.5), fontWeight: 600, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
                      {r.label}
                    </span>
                  </button>
                )}
                {isEditing ? (
                  <span aria-hidden className="shrink-0" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-soft))" }}>
                    {`${[...editing.value].length}/${OTHER_LABEL_MAX}`}
                  </span>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    onClick={() => setEditing({ key: r.key, value: r.label, error: null })}
                    className="tap relative shrink-0 inline-flex items-center justify-center before:absolute before:-inset-[8px] before:content-['']"
                    style={{ width: 24, height: 24, color: "rgb(var(--c-charcoal-soft))" }}
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => setMenu({ key: r.key, anchor: e.currentTarget })}
                  aria-label={t("{allergen} severity: {severity}", { allergen: r.label, severity: t(severityLabel(r.severity)) })}
                  aria-haspopup="menu"
                  className="tap relative shrink-0 inline-flex items-center bg-status-high-bg text-status-high before:absolute before:-inset-[8px] before:content-['']"
                  style={{ gap: 3, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 700 }}
                >
                  {t(severityLabel(r.severity))}
                  <ChevronDown size={11} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) stopEditing();
                    onChange(rows.filter((x) => x.key !== r.key));
                  }}
                  onMouseDown={(e) => isEditing && e.preventDefault()}
                  aria-label={t("Remove {name}", { name: r.label })}
                  className="tap relative shrink-0 inline-flex items-center justify-center before:absolute before:-inset-[10px] before:content-['']"
                  style={{ width: 24, height: 24, color: "rgb(var(--c-charcoal-soft))" }}
                >
                  <X size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
              {rowError && alert(errId, rowError)}
            </div>
          );
        })}
      </div>

      <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
        <label className="flex-1 min-w-0 flex items-center" style={{ ...field, gap: 8, opacity: full ? 0.6 : 1 }}>
          <input
            dir="auto"
            value={text}
            disabled={full}
            maxLength={OTHER_LABEL_MAX}
            placeholder={t("Add another allergy")}
            aria-label={t("Add another allergy")}
            aria-invalid={!!addError}
            aria-describedby={addError ? `${ids}-add-err` : undefined}
            onChange={(e) => {
              setText(e.target.value);
              setAddError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
            style={{ fontSize: textPx(13.5), color: "rgb(var(--c-charcoal))", minHeight: 42 }}
          />
          <span aria-hidden className="shrink-0" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-soft))" }}>
            {`${[...text].length}/${OTHER_LABEL_MAX}`}
          </span>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={full || !text.trim()}
          className="tap shrink-0 inline-flex items-center justify-center disabled:opacity-50"
          style={{ gap: 4, minHeight: 44, borderRadius: 12, paddingInline: 14, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(13.5), fontWeight: 700 }}
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden />
          {t("Add")}
        </button>
      </div>
      {addError && alert(`${ids}-add-err`, addError)}
      <p aria-live="polite" style={{ margin: "6px 0 0", fontSize: textPx(11.5), color: full ? "rgb(var(--c-status-high))" : "rgb(var(--c-charcoal-soft))", fontWeight: full ? 600 : 400 }}>
        {full ? t("{n}/{max}: that's the limit. Remove one to add another.", { n: rows.length, max: OTHER_MAX }) : t("{n}/{max} added", { n: rows.length, max: OTHER_MAX })}
      </p>
      {/* decision 21 (approved line; its Arabic is for Karim's review). */}
      <p style={{ margin: "8px 0 0", fontSize: textPx(12), lineHeight: 1.5, color: "rgb(var(--c-charcoal-soft))" }}>
        {t("Foods are checked by name only for allergies you add yourself.")}
      </p>

      <PopupMenu
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={SEVERITIES.map((s) => ({ ...s, label: t(s.label) }))}
        selected={menu ? rows.find((r) => r.key === menu.key)?.severity ?? null : null}
        onSelect={(v: AllergySeverity) => {
          if (menu) onChange(rows.map((r) => (r.key === menu.key ? { ...r, severity: v } : r)));
          setMenu(null);
        }}
        width={140}
        align="right"
      />
    </div>
  );
}

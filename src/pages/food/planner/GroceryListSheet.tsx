import { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { G3Body, LockedRow } from "../../../components/premium/g3/parts";
import { useG3 } from "../../../components/premium/g3/useG3";
import { fetchGroceryList, setGroceryChecked } from "../../../services/premium/g4Calls";
import { groceryView, withChecked, type GroceryView } from "../../../services/premium/g4";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · the week's grocery list (my_grocery_list(plan_id)): each food
// added up per unit, recipes scaled by the servings planned (and named),
// notes as written. A tick saves at once (set_grocery_item_checked) and is
// put back if the save fails. Premium: a free member sees the locked row and
// the prompt.

export function GroceryListSheet({ open, planId, onClose }: { open: boolean; planId: string; onClose: () => void }) {
  if (!open) return null;
  return <SheetBody planId={planId} onClose={onClose} />;
}

function SheetBody({ planId, onClose }: { planId: string; onClose: () => void }) {
  const list = useG3(() => fetchGroceryList(planId), `grocery:${planId}`);
  const [error, setError] = useState<string | null>(null);

  const tick = async (key: string, checked: boolean) => {
    setError(null);
    list.patch((lines) => withChecked(lines, key, checked));
    const r = await setGroceryChecked(planId, key, checked);
    if (!r.ok) {
      list.patch((lines) => withChecked(lines, key, !checked));
      setError(r.message);
    }
  };

  const row = (g: GroceryView) => (
    <li key={g.key}>
      <button
        type="button"
        role="checkbox"
        aria-checked={g.checked}
        onClick={() => void tick(g.key, !g.checked)}
        className="tap w-full flex items-start gap-3 rounded-xl px-2 py-2 text-start hover:bg-cream-soft"
      >
        <span
          aria-hidden
          className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${g.checked ? "bg-primary-fill border-transparent text-on-primary-fill" : "border-charcoal/25"}`}
        >
          {g.checked && <Check size={13} strokeWidth={3} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[13.5px] font-semibold [overflow-wrap:anywhere] ${g.checked ? "text-charcoal-faint line-through" : "text-charcoal"}`}>{g.name}</span>
          {g.from && <span className="block text-[11px] text-charcoal-faint">{g.from}</span>}
        </span>
        {g.amount && <span className={`shrink-0 text-[12.5px] font-semibold ${g.checked ? "text-charcoal-faint" : "text-charcoal-soft"}`}>{g.amount}</span>}
      </button>
    </li>
  );

  return (
    <BottomSheet open onClose={onClose} title={t("Grocery list")} size="tall">
      <div data-g4="grocery-list" className="pb-2">
        <G3Body state={list.state} onRetry={list.reload} otherwise={list.state.kind === "premium" ? <LockedRow feature="meal_planner" title={t("Grocery list")} meta={t("Everything this week's plan needs")} /> : null}>
          {(lines) => {
            if (lines.length === 0) return <p className="py-4 text-center text-[13px] text-charcoal-faint">{t("Add meals to the plan and they show up here.")}</p>;
            const v = groceryView(lines, appLocale("en-US"));
            return (
              <>
                <ul className="flex flex-col">{v.toBuy.map(row)}</ul>
                {v.done.length > 0 && (
                  <>
                    <p className="mt-4 mb-1 text-[9.5px] font-bold uppercase tracking-[1.9px] rtl:tracking-normal text-charcoal-muted">{t("Got it")}</p>
                    <ul className="flex flex-col">{v.done.map(row)}</ul>
                  </>
                )}
              </>
            );
          }}
        </G3Body>
        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-semibold text-status-high">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

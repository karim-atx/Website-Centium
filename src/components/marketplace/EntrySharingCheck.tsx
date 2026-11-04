import { Check } from "lucide-react";
import type { VenueEntrySystem } from "../../services/front-desk/entrySystem";
import { entrySharingLine, entrySystemDisplay } from "../../services/venues/entrySystem";

// Round H (EU, Karim's decision 5): a gym that keeps its own entry system
// adds its members to it, so joining there needs a checkbox the member ticks.
// Shown only when the gym's entry_system isn't 'none'; the caller records the
// agreement (agree_to_gym_entry_sharing) before it buys or redeems, and the
// database refuses either without it (ATXU1). The box is the class terms
// sheet's checkbox (ClassTermsSheet), the same 20 square in a 44 row.

export function EntrySharingCheck({ gymName, system, checked, onChange }: { gymName: string; system: VenueEntrySystem; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className="tap w-full min-h-11 flex items-start gap-2.5 text-start" style={{ paddingBlock: 8 }}>
      <span
        aria-hidden
        className={`mt-0.5 w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 ${
          checked ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="text-[13px] leading-[19px] font-semibold text-charcoal">{entrySharingLine(gymName, entrySystemDisplay(system.system, system.name))}</span>
    </button>
  );
}

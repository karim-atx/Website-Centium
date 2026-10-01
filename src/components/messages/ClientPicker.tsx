import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";

export interface PickableClient {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Picking from a professional's own connected clients (phase 2B): for a new
 * chat, a group's invitations, and a broadcast list. Only connected clients are
 * offered because only they can be added; the database refuses anybody else
 * regardless.
 *
 * `disabled` lists people already in (shown ticked and fixed), so adding to an
 * existing group cannot re-invite them.
 */
export const ClientPicker: React.FC<{
  clients: PickableClient[];
  selected: Set<string>;
  onToggle: (userId: string) => void;
  disabled?: Set<string>;
  disabledLabel?: string;
  emptyText?: string;
}> = ({ clients, selected, onToggle, disabled, disabledLabel = "Already added", emptyText }) => {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...clients]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((c) => !term || c.name.toLowerCase().includes(term));
  }, [clients, q]);

  if (clients.length === 0) {
    return (
      <p className="text-sm text-charcoal-faint text-center py-8">
        {emptyText ?? "You don't have any connected clients yet."}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {clients.length > 8 && (
        <label className="flex items-center gap-2 h-11 rounded-[14px] bg-cream-card border border-charcoal/10 px-3 mb-2">
          <Search size={16} className="text-charcoal-soft shrink-0" aria-hidden />
          <span className="sr-only">Search clients</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients"
            className="flex-1 min-w-0 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
          />
        </label>
      )}
      {shown.map((c) => {
        const fixed = disabled?.has(c.userId) ?? false;
        const on = fixed || selected.has(c.userId);
        return (
          <button
            key={c.userId}
            type="button"
            disabled={fixed}
            onClick={() => onToggle(c.userId)}
            aria-pressed={on}
            className="tap w-full flex items-center gap-3 px-1 min-h-[56px] text-left border-b border-charcoal/[0.06] disabled:opacity-60"
          >
            <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <PERSON_ICON size={16} className="text-primary-dark" />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-charcoal truncate">{c.name}</span>
              {fixed && <span className="block text-xs text-charcoal-soft">{disabledLabel}</span>}
            </span>
            <span
              aria-hidden
              className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ${
                on ? "bg-primary text-white dark:text-[#0D0B1A]" : "border-2 border-charcoal/20"
              }`}
            >
              {on && <Check size={13} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
      {shown.length === 0 && <p className="text-sm text-charcoal-faint text-center py-6">No clients match.</p>}
    </div>
  );
};

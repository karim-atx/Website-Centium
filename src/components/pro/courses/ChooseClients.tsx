import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { AUDIENCE_LIMITS } from "../../../services/courses/authorRules";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { Field } from "./courseUi";

/**
 * Round D · D-S9 "Choose clients" (Selected clients): the checklist from
 * ShareCourseSheet (picker16: card r16 pad 2 12; rows gap 12 pad 9 0, 36
 * avatar, 14 / 600; 22 r7 check boxes in primary.deep) with search and
 * "{n} selected". Only the professional's current clients are listed, which
 * is what set_course_audience accepts (ATX12 otherwise), up to 500.
 */
export const ChooseClients: React.FC<{ picked: string[]; onChange: (ids: string[]) => void; disabled?: boolean }> = ({ picked, onChange, disabled }) => {
  const { professionalClients } = useApp();
  const [query, setQuery] = useState("");
  const roster = useMemo(
    () => professionalClients.filter((c) => !!c.clientId).filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [professionalClients, query]
  );
  const full = picked.length >= AUDIENCE_LIMITS.max;

  return (
    <div style={{ marginTop: 10 }}>
      <Field id="audience-search" ariaLabel="Search your clients" value={query} onChange={setQuery} placeholder="Search your clients" lead={<Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />} />
      <p aria-live="polite" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, margin: "8px 0" }}>
        {picked.length} selected
      </p>
      {roster.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{professionalClients.length ? "No clients match." : "Clients you work with appear here."}</p>
      ) : (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "2px 12px" }} role="group" aria-label="Your clients">
          {roster.map((c, i) => {
            const on = picked.includes(c.clientId!);
            return (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={disabled || (!on && full)}
                onClick={() => onChange(on ? picked.filter((x) => x !== c.clientId) : [...picked, c.clientId!])}
                className="tap w-full flex items-center text-left disabled:opacity-60"
                style={{ gap: 12, padding: "9px 0", borderTop: i ? `1px solid ${INK.b06}` : undefined }}
              >
                <Avatar name={c.name} url={c.avatarUrl} size={36} />
                <span className="flex-1 min-w-0" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                  {c.name}
                </span>
                <span className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${on ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}`, background: on ? INK.prDeep : "transparent" }}>
                  {on && <Check size={13} strokeWidth={3} aria-hidden style={{ color: INK.card }} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {full && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>A course can be shared with up to {AUDIENCE_LIMITS.max} clients this way.</p>}
    </div>
  );
};

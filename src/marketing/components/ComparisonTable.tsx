import React from "react";
import { Check, Minus } from "lucide-react";
import clsx from "clsx";

export interface ComparisonRow {
  label: string;
  clients: boolean;
  professionals: boolean;
  business: boolean;
}

const Mark: React.FC<{ on: boolean }> = ({ on }) =>
  on ? <Check size={15} className="text-mkt-accent" /> : <Minus size={15} className="text-[#D6D2CA]" />;

/** The honest "what do I actually get" table replacing three bullet lists,
 *  per wireframe 2b. Collapses to a stacked layout on narrow screens so
 *  nothing scrolls sideways. */
export const ComparisonTable: React.FC<{ rows: ComparisonRow[] }> = ({ rows }) => (
  <div className="border border-mkt-line rounded-xl overflow-hidden bg-white">
    <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-2.5 bg-mkt-wash2 px-4 py-3">
      <span className="text-[11px] font-semibold tracking-wide text-mkt-faint">Feature</span>
      <span className="text-[11px] font-semibold tracking-wide text-mkt-faint text-center">Clients</span>
      <span className="text-[11px] font-semibold tracking-wide text-mkt-faint text-center">Professionals</span>
      <span className="text-[11px] font-semibold tracking-wide text-mkt-faint text-center">Business</span>
    </div>
    {rows.map((row, i) => (
      <div
        key={row.label}
        className={clsx(
          "grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr_1fr] gap-2.5 px-4 py-3 items-center",
          i !== 0 && "border-t border-[#F0EEE9]"
        )}
      >
        <span className="text-[13.5px] text-mkt-ink/85 col-span-2 sm:col-span-1">{row.label}</span>
        <div className="hidden sm:flex justify-center">
          <Mark on={row.clients} />
        </div>
        <div className="hidden sm:flex justify-center">
          <Mark on={row.professionals} />
        </div>
        <div className="hidden sm:flex justify-center">
          <Mark on={row.business} />
        </div>
        <div className="flex sm:hidden col-span-2 gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-xs text-mkt-faint">
            <Mark on={row.clients} /> Clients
          </span>
          <span className="flex items-center gap-1.5 text-xs text-mkt-faint">
            <Mark on={row.professionals} /> Pro
          </span>
          <span className="flex items-center gap-1.5 text-xs text-mkt-faint">
            <Mark on={row.business} /> Business
          </span>
        </div>
      </div>
    ))}
  </div>
);

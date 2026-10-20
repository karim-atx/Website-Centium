import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { INK } from "../pro/proInk";
import { Avatar } from "../pro/client/kit";
import { textPx, linePx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import type { Reminder, ReminderGroup } from "../../services/client-forms/logic";
import { ReminderIcon } from "./parts";
import { iconFor, onTone, toneSet } from "./tone";

/**
 * Release 3 · W7 CU5 v3 / CU6 v3 / CU26 v3: the Home reminder card between
 * the date pill and the streak board (source/gen/r21.js remCard21 and
 * remGroup21, literal values). One item is a single card; two or more from
 * the same professional are one card, "{n} from {pro}", most urgent on top
 * with page dots, and See all expands it in place.
 */

const hitArea = "relative before:absolute before:content-[''] before:-inset-x-1 before:-inset-y-1.5";

export const ReminderCard: React.FC<{
  group: ReminderGroup;
  proAvatarUrl?: string | null;
  onAction: (r: Reminder) => void;
}> = ({ group, proAvatarUrl, onAction }) => {
  const dark = useIsDark();
  const [open, setOpen] = useState(false);

  if (group.items.length === 1) {
    const r = group.items[0];
    const tn = toneSet(r.tone, dark);
    return (
      <div data-pro-reminder className="flex items-center animate-fade-slide-up" style={{ borderRadius: 16, background: tn.bg, padding: "12px 14px", gap: 12, marginBottom: 13 }}>
        <ReminderIcon kind={r.kind} tone={tn} proName={group.proName} proAvatarUrl={proAvatarUrl} />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), color: INK.ch }}>{r.title}</span>
          <span className="block" style={{ fontSize: textPx(11), lineHeight: linePx(15), color: INK.chS, marginTop: 2 }}>{r.detail}</span>
        </span>
        <button
          type="button"
          onClick={() => onAction(r)}
          className={`tap inline-flex items-center shrink-0 ${hitArea}`}
          style={{ height: 32, padding: "0 12px", borderRadius: 10, background: tn.ink, color: onTone(dark), fontSize: textPx(12), fontWeight: 700 }}
        >
          {r.action}
        </button>
      </div>
    );
  }

  const tn = toneSet("pr", dark);
  const rows = open ? group.items : group.items.slice(0, 1);
  const rule = dark ? "rgba(245,243,250,0.06)" : "rgba(255,255,255,0.8)";

  return (
    <section data-pro-reminder aria-label={`${group.items.length} from ${group.proName}`} className="overflow-hidden animate-fade-slide-up" style={{ borderRadius: 16, background: tn.bg, marginBottom: 13 }}>
      <div className="flex items-center" style={{ gap: 10, padding: "12px 14px 0" }}>
        <span className="flex">
          <Avatar name={group.proName} url={proAvatarUrl} size={22} tone="teal" />
        </span>
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: tn.ink }}>
          {group.items.length} from {group.proName}
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`tap inline-flex items-center ${hitArea}`}
          style={{ gap: 2, fontSize: textPx(12), fontWeight: 700, color: tn.ink }}
        >
          {open ? "Show less" : "See all"}
          {open ? <ChevronUp size={13} strokeWidth={2.4} aria-hidden /> : <ChevronDown size={13} strokeWidth={2.4} aria-hidden />}
        </button>
      </div>
      {rows.map((r, i) => {
        const tk = toneSet(r.tone, dark);
        return (
          <div key={r.key} className="flex items-center" style={{ gap: 12, padding: "10px 14px", borderTop: i ? `1px solid ${rule}` : undefined }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: tk.tile }}>
              {React.createElement(iconFor(r.kind), { size: 16, strokeWidth: 1.75, "aria-hidden": true, style: { color: tk.ink } })}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(17), color: INK.ch }}>{r.title}</span>
              <span className="block" style={{ fontSize: textPx(11), color: INK.chS }}>{r.detail}</span>
            </span>
            <button
              type="button"
              onClick={() => onAction(r)}
              className={`tap inline-flex items-center shrink-0 ${hitArea}`}
              style={{
                height: 30,
                padding: "0 11px",
                borderRadius: 10,
                background: i ? "transparent" : tk.ink,
                boxShadow: i ? `inset 0 0 0 1px ${tk.ink}` : undefined,
                color: i ? tk.ink : onTone(dark),
                fontSize: textPx(12),
                fontWeight: 700,
              }}
            >
              {r.action}
            </button>
          </div>
        );
      })}
      {open ? (
        <p style={{ fontSize: textPx(11), color: INK.chF, padding: "0 14px 12px" }}>Most urgent first. Anything you skip stays here.</p>
      ) : (
        <div className="flex justify-center" aria-hidden style={{ gap: 5, padding: "0 0 10px" }}>
          {group.items.map((r, i) => (
            <span key={r.key} style={{ width: i ? 6 : 16, height: 6, borderRadius: 9999, background: tn.ink, opacity: i ? 0.25 : 1 }} />
          ))}
        </div>
      )}
    </section>
  );
};

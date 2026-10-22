import React, { useState } from "react";
import { Eye, MessageCircle, Navigation } from "lucide-react";
import { MasterSheet, px, lh, useMarketColors } from "../../../pages/business-market/listingParts";
import { DirectionsMenu } from "../../../pages/marketplace/venueParts";
import { TicketCheck } from "../../market/ProfessionalCard";
import { FOCUS_CSS } from "../../market/usePress";
import { hexAlpha, liftInk } from "../../market/marketColor";
import { useIsDark } from "../../../hooks/useIsDark";
import { time12Split } from "../../../utils/time12";
import { bookedText, durationText, payText, ticketTones, whenText } from "../../../services/calendar-sync/model";
import type { ClassInfo } from "./classModel";

// Market + Share 3.0 · W5 · P-CA.4 Event detail: the Class sheet (Professional
// Calendar Screens lines 116–136). MasterBottomSheet "Class"; the ticket
// header (radius 14, the class colour's step fill #E6F1EF, overflow hidden):
// the class 16 / 800, the gym 12.5 / 600 and "Hired via Centium · {role}"
// (11 / 700, the 12 tick, margin-top 5) in the deep ink #2F5F58; the 76 time
// stub (border-left 1.5px dashed in the class colour; the time 17 / 800, the
// meridiem 10 / 700) with two 14 notches at right 69; the rows panel
// (margin-top 12, radius 14, --sgrey #F2F3F5, padding 2 14; rows 9 0, 12.5,
// the label --slabel #575863, the value 700 right, 0.5px --div between):
// Location, When, Duration, Repeats, Booked, Pay per session; the links grid
// (margin-top 12, 3 columns, gap 8; tiles min 64, radius 14, 1px --border,
// gap 6, the 18 icon --pdark #7D6BB5 stroke 2, 12 / 700): View class, Message
// gym, Directions; the note 11.5 / 16 --faint (margin-top 12).
// A row the class doesn't carry is left out (a live assigned class has no
// pay, bookings, location or hire: classModel); a link it can't follow is
// shown at 40% and disabled. Kept from the old detail sheet: the gym's notes.

const Row: React.FC<{ k: string; v: string; first: boolean; ink?: string }> = ({ k, v, first, ink }) => {
  const m = useMarketColors();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: first ? 0 : `0.5px solid ${m.div}`, fontSize: px(12.5) }}>
      <span style={{ color: m.slabel }}>{k}</span>
      <span style={{ fontWeight: 700, textAlign: "right", color: ink ?? m.ink, minWidth: 0, overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
};

const LinkTile: React.FC<{ label: string; icon: React.ReactNode; onClick: (el: HTMLButtonElement) => void; disabled?: boolean }> = ({ label, icon, onClick, disabled }) => {
  const m = useMarketColors();
  return (
    <button
      type="button"
      onClick={(e) => !disabled && onClick(e.currentTarget)}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className="tap market-focus"
      style={{ minHeight: 64, boxSizing: "content-box", borderRadius: 14, border: `1px solid ${m.border}`, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: px(12), fontWeight: 700, color: m.ink, fontFamily: "inherit", opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      <span aria-hidden style={{ color: m.pdark, display: "flex" }}>{icon}</span>
      {label}
    </button>
  );
};

export const HiredClassSheet: React.FC<{
  info: ClassInfo | null;
  onClose: () => void;
  onViewClass: (sessionId: string) => void;
  onMessageGym: ((businessId: string) => void) | null;
  onNote: (text: string) => void;
}> = ({ info, onClose, onViewClass, onMessageGym, onNote }) => {
  const m = useMarketColors();
  const dark = useIsDark();
  const [dirAnchor, setDirAnchor] = useState<HTMLElement | null>(null);
  // Kept while the sheet closes, so it slides away with its content.
  const [kept, setKept] = useState<ClassInfo | null>(info);
  if (info && info !== kept) setKept(info);
  const c = info ?? kept;
  if (!c) return <MasterSheet open={false} onClose={onClose} title="Class">{null}</MasterSheet>;
  const tones = ticketTones(c.colour);
  const bg = dark ? hexAlpha(c.colour, 0.16) : tones.bg;
  const ink = dark ? liftInk(c.colour) : tones.ink;
  const perf = dark ? liftInk(c.colour) : c.colour;
  const t = time12Split(c.start);
  const rows: [string, string, string?][] = [];
  if (c.location) rows.push(["Location", c.location]);
  rows.push(["When", whenText(c.date, c.start, c.end)]);
  const dur = durationText(c.start, c.end);
  if (dur) rows.push(["Duration", dur]);
  if (c.recurrence) rows.push(["Repeats", c.recurrence]);
  const booked = bookedText(c.booked, c.capacity);
  if (booked) rows.push(["Booked", booked]);
  const pay = payText(c.pay);
  if (pay) rows.push(["Pay per session", pay]);
  if (c.status !== "scheduled") rows.push(["Status", c.status === "cancelled" ? "Cancelled" : "Completed", c.status === "cancelled" ? m.high : m.good]);
  if (c.notes) rows.push(["Notes", c.notes]);
  const mark = c.hired ? ["Hired via Centium", c.roleTitle].filter(Boolean).join(" · ") : null;
  return (
    <MasterSheet open={!!info} onClose={onClose} title="Class">
      <style>{FOCUS_CSS}</style>
      <div style={{ color: m.ink, lineHeight: "normal" }}>
        <div style={{ position: "relative", display: "flex", borderRadius: 14, background: bg, overflow: "hidden" }} data-class-ticket>
          <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
            <div style={{ fontSize: px(16), fontWeight: 800, textDecoration: c.status === "cancelled" ? "line-through" : undefined }}>{c.title}</div>
            <div style={{ fontSize: px(12.5), fontWeight: 600, color: ink }}>{c.businessName}</div>
            {mark ? (
              <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 4, fontSize: px(11), fontWeight: 700, color: ink }}>
                <TicketCheck size={12} />
                {mark}
              </div>
            ) : null}
          </div>
          <div style={{ width: 76, flex: "none", borderLeft: `1.5px dashed ${perf}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {t ? (
              <>
                <span style={{ fontSize: px(17), fontWeight: 800, color: ink }}>{t.time}</span>
                <span style={{ fontSize: px(10), fontWeight: 700, color: ink }}>{t.meridiem}</span>
              </>
            ) : null}
          </div>
          <span aria-hidden style={{ position: "absolute", right: 69, top: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
          <span aria-hidden style={{ position: "absolute", right: 69, bottom: -7, width: 14, height: 14, borderRadius: 999, background: m.sbody }} />
        </div>
        <div style={{ marginTop: 12, borderRadius: 14, background: m.sgrey, padding: "2px 14px" }}>
          {rows.map(([k, v, i], n) => (
            <Row key={k} k={k} v={v} first={n === 0} ink={i} />
          ))}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <LinkTile label="View class" icon={<Eye size={18} strokeWidth={2} />} onClick={() => onViewClass(c.sessionId)} />
          <LinkTile label="Message gym" icon={<MessageCircle size={18} strokeWidth={2} />} disabled={!c.businessId || !onMessageGym} onClick={() => c.businessId && onMessageGym?.(c.businessId)} />
          <LinkTile label="Directions" icon={<Navigation size={18} strokeWidth={2} />} disabled={!c.location} onClick={(el) => setDirAnchor(el)} />
        </div>
        <p style={{ margin: "12px 0 0", fontSize: px(11.5), lineHeight: lh(16), color: m.faint }}>
          {`Added by ${c.businessName || "the gym"} when they assigned you this class. Changes the gym makes show here on their own.`}
        </p>
      </div>
      <DirectionsMenu open={!!dirAnchor} onClose={() => setDirAnchor(null)} anchor={dirAnchor} address={c.location} coords={null} onCopied={onNote} />
    </MasterSheet>
  );
};

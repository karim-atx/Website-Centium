import React from "react";
import { Tag } from "lucide-react";
import { formatCents, priceBreakdown } from "../../../services/courses/author";
import type { DripMode } from "../../../services/pro/courses";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { INK } from "../proInk";
import { ComingSoonPill } from "../ComingSoon";
import { Field, Label, RadioRows } from "./courseUi";
import { DRIP_EVERY_DAYS, parsePrice } from "./courseModel";

export interface AccessDraft {
  free: boolean;
  price: string;
  mode: DripMode;
}

/**
 * Release 3 · W6 MO28 "Create course · 4 Access" (cAccess18):
 * - Who can join (radio18): a published course is in the catalogue for any
 *   adult (courses_read), so Public is the one real choice; "All your
 *   clients" and "Selected clients" have no backend (no audience column)
 *   and are Coming soon;
 * - Price: Free / Paid tabs (36 high, 12, 8 under), the price field with the
 *   tag (15), the frame's note (11.5 text.faint 1.5), and the existing
 *   commission breakdown (course_commission_percent, rounded as
 *   course_net_earnings rounds);
 * - How lessons unlock (DB-6 drip): All at once, or One week at a time with
 *   "Every 7 days" (12 / 700 primary.deep); saved with set_course_drip and
 *   set_module_opens_after (week n opens 7 × n days after enrolment).
 */
export const AccessStep: React.FC<{
  value: AccessDraft;
  onChange: (v: AccessDraft) => void;
  commission: number | null;
  editable: boolean;
  footer: React.ReactNode;
}> = ({ value, onChange, commission, editable, footer }) => {
  const cents = parsePrice(value.price);
  const breakdown = cents !== null && commission !== null ? priceBreakdown(cents, commission) : null;
  return (
    <div>
      <Label mt={0}>Who can join</Label>
      <RadioRows
        name="Who can join"
        on="public"
        onPick={() => undefined}
        locked={!editable}
        rows={[
          { key: "all", title: "All your clients", sub: "Anyone you work with now", disabled: true, trailing: <ComingSoonPill /> },
          { key: "selected", title: "Selected clients", sub: "Choose people or groups", disabled: true, trailing: <ComingSoonPill /> },
          { key: "public", title: "Public", sub: "On your profile and in Community › Courses" },
        ]}
      />

      <Label>Price</Label>
      <SegmentedTabs
        items={[
          { key: "free", label: "Free" },
          { key: "paid", label: "Paid" },
        ]}
        activeKey={value.free ? "free" : "paid"}
        onChange={(k) => editable && onChange({ ...value, free: k === "free" })}
        tabHeight={36}
        labelSize={12}
        darkTone="partB"
        className="mb-2"
      />
      {!value.free && (
        <Field
          id="course-price"
          ariaLabel="Price in dollars"
          value={value.price}
          onChange={(v) => onChange({ ...value, price: v })}
          inputMode="decimal"
          disabled={!editable}
          placeholder="$"
          invalid={value.price !== "" && cents === null}
          lead={<Tag size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />}
        />
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 6 }}>
        You receive the price less Centium's commission. Paid courses open when payments in the app go live; until then a paid course can be published as free.
      </p>
      {!value.free && breakdown && breakdown.priceCents > 0 && (
        <div className="flex flex-col" style={{ borderRadius: 12, background: INK.soft, padding: "10px 12px", gap: 4, marginTop: 8, fontSize: textPx(12.5) }}>
          <span className="flex justify-between">
            <span style={{ color: INK.chF }}>Learner pays</span>
            <b style={{ color: INK.ch }}>{formatCents(breakdown.priceCents)}</b>
          </span>
          <span className="flex justify-between">
            <span style={{ color: INK.chF }}>Centium commission ({commission}%)</span>
            <span style={{ color: INK.chF }}>−{formatCents(breakdown.commissionCents)}</span>
          </span>
          <span className="flex justify-between" style={{ borderTop: `1px solid ${INK.b06}`, paddingTop: 4 }}>
            <b style={{ color: INK.ch }}>You receive</b>
            <b style={{ color: INK.ch }}>{formatCents(breakdown.netCents)}</b>
          </span>
        </div>
      )}

      <Label>How lessons unlock</Label>
      <RadioRows
        name="How lessons unlock"
        on={value.mode}
        locked={!editable}
        onPick={(k) => onChange({ ...value, mode: k as DripMode })}
        rows={[
          { key: "all_at_once", title: "All at once", sub: "Clients go at their own pace" },
          {
            key: "weekly",
            title: "One week at a time",
            sub: `The next week opens ${DRIP_EVERY_DAYS} days after the last`,
            trailing: <span style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, whiteSpace: "nowrap" }}>Every {DRIP_EVERY_DAYS} days</span>,
          },
        ]}
      />
      {footer}
    </div>
  );
};

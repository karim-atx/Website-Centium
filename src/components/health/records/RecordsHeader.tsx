import React, { useRef, useState } from "react";
import { ChevronLeft, MoreVertical, ShieldCheck } from "lucide-react";
import { FixedHeader } from "../../ui/FixedHeader";
import { PopupMenu } from "../../ui/PopupMenu";
import { textPx, linePx } from "../../../theme/textSize";
import { INK, useHealthMode } from "./kit";
import { t } from "../../../i18n/core";

export interface HeaderMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

/**
 * HE1.9 #1-#4 / HE1.9.1 #1-#3: the fixed area (pad 24 16 14 16, white, dark
 * #1C1F28 once content passes under, with the hairline, HE1.2.s), back 36
 * r9999 with ChevronLeft 20 #5B5349 (dark #B8B3C7), gap 6, title 24/30 700
 * ls-0.5, and the second 36 button on the right edge (⋮, MoreVertical 20) with
 * its menu (OURS-biomarkers-menu: the HE1.9.b dropdown, 172 wide r14 pad 8,
 * rows 36 r8, 0.5px borders).
 */
export const RecordsHeader: React.FC<{
  title: string;
  onBack: () => void;
  menu?: HeaderMenuItem[];
  children?: React.ReactNode;
  /**
   * Release 3 CU17 v2 "Shared with …" banner under the tabs (r28.js recBody28:
   * r14 #EAF4F2 (dark #293339), pad 10 12, gap 10, shield-check 16/2
   * #3C6B65 (dark #B2D4CF), label 12.5/600 lh1.4, "Manage" 12/700
   * #5F5093 (dark #C3B3FB)). Omitted: nothing is drawn, as before.
   */
  shared?: { label: string; onManage: () => void } | null;
  /** The ⋮ menu width (default 155, as before). */
  menuWidth?: number;
}> = ({ title, onBack, menu, children, shared, menuWidth = 155 }) => {
  const { dark } = useHealthMode();
  const menuBtn = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <FixedHeader paddingBottom={14} fillClassName="bg-cream dark:bg-[#1C1F28]">
      <div className="flex items-center" style={{ gap: 6, minHeight: 36, marginInlineStart: -8 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label={t("Back")}
          className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
          style={{ width: 36, height: 36 }}
        >
          <ChevronLeft size={20} className="rtl:-scale-x-100" style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
        </button>
        <h1 className="flex-1 min-w-0 line-clamp-2" style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5, color: INK }}>
          {title}
        </h1>
        {menu && menu.length > 0 && (
          <button
            ref={menuBtn}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("More options")}
            aria-haspopup="menu"
            className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
            style={{ width: 36, height: 36, marginInlineEnd: -8 }}
          >
            <MoreVertical size={20} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
          </button>
        )}
      </div>
      {children}
      {shared && (
        <div
          data-records-shared
          className="flex items-center"
          style={{ marginTop: 12, gap: 10, borderRadius: 14, paddingBlock: "0", paddingInline: "12px 0", minHeight: 44, background: dark ? "#293339" : "#EAF4F2" }}
        >
          <ShieldCheck size={16} strokeWidth={2} className="shrink-0" style={{ color: dark ? "#B2D4CF" : "#3C6B65" }} aria-hidden />
          <span className="flex-1 min-w-0" style={{ padding: "10px 0", fontSize: textPx(12.5), lineHeight: 1.4, fontWeight: 600, color: INK }}>
            {shared.label}
          </span>
          <button
            type="button"
            onClick={shared.onManage}
            className="tap shrink-0 min-h-[44px]"
            style={{ padding: "0 12px", fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: dark ? "#C3B3FB" : "#5F5093" }}
          >
            {t("Manage")}
          </button>
        </div>
      )}
      {menu && menu.length > 0 && (
        <PopupMenu
          open={open}
          onClose={() => setOpen(false)}
          anchor={menuBtn.current}
          options={menu.map((m) => ({ value: m.key, label: m.label, icon: m.icon, destructive: m.destructive }))}
          onSelect={(v) => menu.find((m) => m.key === v)?.onSelect()}
          width={menuWidth}
          align="right"
          hairline
          rowLineHeight={18}
        />
      )}
    </FixedHeader>
  );
};

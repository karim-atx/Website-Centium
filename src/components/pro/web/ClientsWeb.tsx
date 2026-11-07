import React, { useRef } from "react";
import { ArrowRight, CalendarDays, ClipboardList, MessageCircle, MoreVertical, Tag, UserPlus, Users } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";
import { StatusRing } from "../StatusRing";
import { Avatar } from "../client/kit";
import type { ProLane } from "../subtypeLanes";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-CL (WP-CL Clients Web v2): the Clients page as
// a list-detail from 1024px. The list column (5 of 12 at 1440, 4 of 8 on the
// rail) keeps the repo roster, its controls and its sheets; the preview the
// app opens on a long press is the detail pane beside it (7 of 12, 4 of 8),
// the first client by default. Above 1440 the list widens and the preview
// keeps its 1440 width (section 2.1). Mobile keeps its own page.

/** The page body: 32 (24 on the rail) padding, the two columns 24 apart. */
/** `head` (the 64 page header) sits above the padded area; `tabs` (the status tabs) spans the list and the preview. */
export const ClientsSplit: React.FC<{ list: React.ReactNode; detail: React.ReactNode; head?: React.ReactNode; tabs?: React.ReactNode }> = ({ list, detail, head, tabs }) => {
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  return (
    <>
    {head}
    <div
      data-pro-web="clients"
      style={{
        maxWidth: WEB_CONTENT_MAX,
        boxSizing: "border-box",
        padding: `32px ${margin}px`,
        display: "grid",
        // 1440: (1184 - 64 - 24) × 7 / 12 = 639 for the preview; the list takes the rest.
        gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr) minmax(0,639px)",
        columnGap: 24,
        alignItems: "start",
      }}
    >
      {tabs && <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>{tabs}</div>}
      <section aria-label={t("Client list")} style={{ minWidth: 0 }}>
        {list}
      </section>
      {detail}
    </div>
    </>
  );
};

export interface ClientDetailFacts {
  name: string;
  avatarUrl: string | null;
  statusLabel: string;
  attention: boolean;
  onboarding: boolean;
  ring: number | null;
  next: string;
  nextLabel: string;
  planTitle: string;
  plan: string;
  tags: string;
  unread: string;
}

/**
 * The detail pane: r20, 1px border, padding 28 (20); avatar 88 (64), name
 * 40/48 800 (28/36), the status 15/24 600 (Needs attention in #C0392B), the
 * ring 84 (64), ⋮ 40; four fact rows of 72 with a 44 tile, label 13/20,
 * value 17/24 600; Message (lavender) and Open (primary), 44 high, 12 apart.
 */
export const ClientDetailPanel: React.FC<{
  facts: ClientDetailFacts;
  lane: ProLane;
  onMessage: () => void;
  onOpen: () => void;
  onMenu: (el: HTMLElement) => void;
}> = ({ facts: f, lane, onMessage, onOpen, onMenu }) => {
  const { rail } = useWebLayout();
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const pad = rail ? 20 : 28;
  const rows: [typeof CalendarDays, string, string][] = [
    [CalendarDays, f.nextLabel, f.next],
    [ClipboardList, f.planTitle, f.plan],
    [Tag, t("Tags"), f.tags],
    [MessageCircle, t("Messages"), f.unread],
  ];
  return (
    <section
      aria-label={t("Client preview, {name}", { name: f.name })}
      className="flex flex-col"
      style={{ minWidth: 0, boxSizing: "border-box", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: pad }}
    >
      <div className="flex items-center" style={{ gap: rail ? 14 : 20, paddingBottom: pad, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <Avatar name={f.name} url={f.avatarUrl} size={rail ? 64 : 88} tone={f.onboarding ? "sky" : f.attention ? "gold" : "pr"} />
        <span className="flex-1 min-w-0">
          <span className="block" title={f.name} style={{ fontSize: rail ? 28 : 40, lineHeight: rail ? "36px" : "48px", fontWeight: 800, letterSpacing: "-0.02em", color: "#241F1B", overflowWrap: "anywhere" }}>
            {f.name}
          </span>
          <span className="block" style={{ marginTop: 4, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: f.attention ? "#C0392B" : "#5B5349" }}>
            {f.statusLabel}
          </span>
        </span>
        <span className="shrink-0 flex items-center justify-center" style={{ width: rail ? 64 : 84, height: rail ? 64 : 84 }}>
          <span style={{ transform: `scale(${(rail ? 64 : 84) / 56})` }}>
            <StatusRing value={f.ring} lane={lane} />
          </span>
        </span>
        <button
          ref={menuRef}
          type="button"
          aria-label={t("More actions for {name}", { name: f.name })}
          aria-haspopup="menu"
          onClick={() => menuRef.current && onMenu(menuRef.current)}
          className="flex items-center justify-center shrink-0 rounded-full hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 40, height: 40, marginInlineEnd: -10 }}
        >
          <MoreVertical size={20} strokeWidth={2} aria-hidden style={{ color: "#8C8378" }} />
        </button>
      </div>
      <div className="flex flex-col">
        {rows.map(([Icon, label, value]) => (
          <div key={label} className="flex items-center" style={{ minHeight: 72, gap: 16, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "#F5F5F6" }}>
              <Icon size={20} strokeWidth={1.9} aria-hidden style={{ color: "#8C8378" }} />
            </span>
            <span className="flex-1 min-w-0" style={{ paddingBlock: 8 }}>
              <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {label}
              </span>
              <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B", overflowWrap: "anywhere" }}>
                {value}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginTop: pad }}>
        <button
          type="button"
          onClick={onMessage}
          className="flex items-center justify-center hover:bg-[#E7E2F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ height: 44, borderRadius: 16, background: "#F0EDF9", color: "#5F5093", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
        >
          <MessageCircle size={20} strokeWidth={2} aria-hidden />
          {t("Message")}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-center hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ height: 44, borderRadius: 16, background: "#9A8CD6", color: "#FFFFFF", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
        >
          <ArrowRight size={20} strokeWidth={2} aria-hidden />
          {t("Open")}
        </button>
      </div>
    </section>
  );
};

/** WP-CL empty: one card filling the page (r24, #FAFAFB), the 112 tile, title 28/36, line 15/24, the CTA 44 up to 400 wide. */
export const ClientsEmptyWeb: React.FC<{ patients: boolean; onAdd: () => void }> = ({ patients, onAdd }) => {
  const { rail } = useWebLayout();
  return (
    <div style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: `32px ${rail ? 24 : 32}px` }}>
      <section
        aria-label={patients ? t("No patients yet") : t("No clients yet")}
        className="flex flex-col items-center justify-center text-center"
        style={{ minHeight: "calc(100dvh - 64px - 64px - 140px)", boxSizing: "border-box", borderRadius: 24, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.08)", padding: 40 }}
      >
        <span className="flex items-center justify-center" style={{ width: 112, height: 112, borderRadius: 32, background: "#F0EDF9" }}>
          <Users size={52} strokeWidth={1.5} aria-hidden style={{ color: "#7D67D9" }} />
        </span>
        <h2 style={{ margin: "24px 0 0", fontSize: 28, lineHeight: "36px", fontWeight: 700, color: "#241F1B" }}>{patients ? t("No patients yet") : t("No clients yet")}</h2>
        <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: "24px", color: "#8C8378", maxWidth: 420, textWrap: "pretty" } as React.CSSProperties}>
          {patients ? t("Add your first patient to run their plans, sessions and progress from here.") : t("Add your first client to run their plans, sessions and progress from here.")}
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ marginTop: 28, width: "100%", maxWidth: 400, height: 44, borderRadius: 16, background: "#9A8CD6", color: "#FFFFFF", gap: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
        >
          <UserPlus size={20} strokeWidth={2} aria-hidden />
          {patients ? t("Add your first patient") : t("Add your first client")}
        </button>
      </section>
    </div>
  );
};

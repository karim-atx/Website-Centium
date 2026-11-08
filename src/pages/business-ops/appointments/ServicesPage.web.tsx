import React, { useState } from "react";
import { CalendarClock, Clock, HandHeart, Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { fetchServices, fetchStaffHours, removeStaffHours, type Service, type StaffHours } from "../../../services/appointments";
import { fetchTeam } from "../../../services/business-team/team";
import type { Load } from "../../../services/store/backend";
import { money } from "../../../services/store/format";
import { formatMinutes12 } from "../../../utils/time12";
import { DAY_LONG } from "../../../utils/week";
import { useOnline } from "../../../hooks/useOnline";
import { t, tk, tn } from "../../../i18n/core";
import { WebPageHeader } from "../../../components/web/WebPageHeader";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { EmptyCard, ErrorCard, ListSkeleton, useOpsToast } from "../store/opsKit";
import { useLive, useStoreBusiness } from "../store/storeShared";
import { HoursSheet, ServiceSheet } from "./ServicesPage";

// Website viewport v1 · WB-ST-AP.3 Services and free slots (WB-ST Services
// Web v4; Karim's decisions 6 and 8): Services and Free slots as two tables,
// a purple header row, rows 52, cards that hug their rows. Services: the
// HandHeart tile and name, Duration, Price, a Visibility chip and an edit
// pencil (the web affordance for the mobile row tap). Free slots: the day once
// per group, With (initials), From, To and a remove button. Empty: the header
// row, the mobile copy and Add inside the card. The sheets are the mobile
// ServicesPage's own (side sheets on web). Data, rules and copy as on mobile.

const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
};

interface Person {
  id: string;
  name: string;
}
interface Setup {
  services: Service[];
  hours: StaffHours[];
  people: Person[];
  pending: boolean;
}

// The mobile page's loader, unchanged (ServicesPage.tsx loadSetup).
async function loadSetup(businessId: string): Promise<Load<Setup>> {
  const [s, h, team] = await Promise.all([fetchServices(businessId), fetchStaffHours(businessId), fetchTeam(businessId)]);
  if (s.status === "error") return s;
  if (h.status === "error") return h;
  return {
    status: "ok",
    value: {
      services: s.status === "ok" ? s.value : [],
      hours: h.status === "ok" ? h.value : [],
      people: team.ok ? team.value.filter((p) => p.acceptedAt).map((p) => ({ id: p.professionalId, name: p.name })) : [],
      pending: s.status === "pending" || h.status === "pending",
    },
  };
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

// Initials discs: lavender and teal, alternating by the person's place on the team.
const DISCS = [
  { bg: "#F0EDF9", ink: "#5F5093" },
  { bg: "#E3F1EE", ink: "#2F5F58" },
];

const HEAD_ROW: React.CSSProperties = {
  minHeight: 40,
  padding: "0 16px",
  background: "rgba(143,104,246,0.2)",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "#4A3A8C",
};

const Cell: React.FC<{ children?: React.ReactNode; title?: string; strong?: boolean }> = ({ children, title, strong }) => (
  <span role="cell" title={title} className="min-w-0 flex items-center tabular-nums" style={{ gap: 10, fontSize: 15, lineHeight: "24px", fontWeight: strong ? 600 : 500, color: "#241F1B" }}>
    {children}
  </span>
);

const Text: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{children}</span>;

const RowAction: React.FC<{ label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }> = ({ label, icon: Icon, onClick, disabled }) => (
  <span role="cell" className="flex justify-end">
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center hover:bg-[#F0EDF9] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
      style={{ width: 36, height: 36, marginInlineEnd: -6, borderRadius: 10 }}
    >
      <Icon size={16} strokeWidth={2} style={{ color: "#7D6BB5" }} aria-hidden />
    </button>
  </span>
);

const Table: React.FC<{
  label: string;
  heads: string[];
  cols: string;
  onAdd: () => void;
  empty: { icon: LucideIcon; title: string; body: string } | null;
  children?: React.ReactNode;
}> = ({ label, heads, cols, onAdd, empty, children }) => (
  <section aria-label={label} className="shrink-0 flex flex-col" style={{ gap: 12 }}>
    <div className="shrink-0 flex items-end justify-between" style={{ borderBottom: "1.5px solid #AEA1DC", padding: "0 2px 8px" }}>
      <h2 className="uppercase whitespace-nowrap" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, letterSpacing: "0.1em", color: "#71685E" }}>
        {label}
      </h2>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ gap: 4, height: 36, padding: "0 10px", marginInlineEnd: -10, borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D6BB5" }}
      >
        <Plus size={16} strokeWidth={2.4} aria-hidden />
        {t("Add")}
      </button>
    </div>
    <div role="table" aria-label={label} className="shrink-0 overflow-hidden bg-white" style={{ boxSizing: "content-box", borderRadius: 18, border: "1px solid rgba(36,31,27,0.08)" }}>
      <div role="row" className="grid items-center" style={{ ...HEAD_ROW, gridTemplateColumns: cols, columnGap: 16 }}>
        {heads.map((h) => (
          <span key={h} role="columnheader" className="min-w-0 whitespace-nowrap">
            {h}
          </span>
        ))}
        <span aria-hidden />
      </div>
      {empty ? (
        <div className="flex items-center" style={{ gap: 16, padding: "20px 16px" }}>
          <span className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9" }}>
            <empty.icon size={20} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
              {empty.title}
            </span>
            <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349", textWrap: "pretty" } as React.CSSProperties}>
              {empty.body}
            </span>
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#F0EDF9", color: "#5F5093", gap: 6, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden />
            {t("Add")}
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  </section>
);

const Row: React.FC<{ cols: string; first: boolean; joined?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ cols, first, joined, onClick, children }) => (
  <div
    role="row"
    onClick={onClick}
    className={`grid items-center hover:bg-[#FAF8FE] ${onClick ? "cursor-pointer" : ""}`}
    style={{ boxSizing: "content-box", gridTemplateColumns: cols, columnGap: 16, minHeight: 52, padding: "0 16px", borderTop: first || joined ? "1px solid transparent" : "1px solid #EFEDF5" }}
  >
    {children}
  </div>
);

export default function ServicesPageWeb() {
  const online = useOnline();
  const { rail } = useWebLayout();
  const { businessId } = useStoreBusiness();
  const live = useLive(businessId ? () => loadSetup(businessId) : null, 0);
  const [toast, showToast] = useOpsToast();
  const [svc, setSvc] = useState<{ open: boolean; s: Service | null }>({ open: false, s: null });
  const [hoursOpen, setHoursOpen] = useState(false);
  const s = live.state;
  const d = s.status === "ok" ? s.value : null;
  const nameOf = (id: string) => d?.people.find((p) => p.id === id)?.name ?? t("Team member");
  const discOf = (id: string) => DISCS[Math.max(0, d?.people.findIndex((p) => p.id === id) ?? 0) % DISCS.length];

  const removeHours = async (h: StaffHours) => {
    const r = await removeStaffHours(h.id);
    if (!r.ok) showToast(t("Couldn't remove the hours. Try again."), false);
    else {
      showToast(t("Hours removed."), false);
      void live.refresh();
    }
  };

  const svcCols = "minmax(0,40%) repeat(3,minmax(0,1fr)) 40px";
  const svcColsRail = "minmax(0,34%) repeat(3,minmax(0,1fr)) 40px";
  const hourCols = "repeat(4,minmax(0,1fr)) 40px";

  return (
    <div>
      <div className="sticky top-0 z-30">
        <WebPageHeader title={t("Services and free slots")} sub={t("What clients can book, and when")} back={{ to: "/app/more", label: tk("Back to More") }} />
      </div>
      <div style={{ padding: 32 }}>
        <div className="max-w-[1600px] flex flex-col" style={{ gap: 32 }}>
          {s.status === "error" ? (
            <ErrorCard text={t("Couldn't load your services.")} onRetry={live.reload} />
          ) : s.status === "loading" || !d ? (
            <ListSkeleton />
          ) : d.pending ? (
            <EmptyCard icon={CalendarClock} title={t("Coming soon")} body={t("Setting up services and free slots for bookings is on its way.")} />
          ) : (
            <>
              <ServicesTable services={d.services} cols={rail ? svcColsRail : svcCols} onAdd={() => setSvc({ open: true, s: null })} onEdit={(x) => setSvc({ open: true, s: x })} />
              <Table
                label={t("Free slots")}
                heads={[t("Day"), t("With"), t("From"), t("To")]}
                cols={hourCols}
                onAdd={() => setHoursOpen(true)}
                empty={d.hours.length === 0 ? { icon: Clock, title: t("No free slots yet"), body: t("Add the hours each person takes bookings. Weeks start on Monday.") } : null}
              >
                {d.hours.map((h, i) => {
                  const same = i > 0 && d.hours[i - 1].weekday === h.weekday;
                  const day = DAY_LONG[h.weekday - 1] ? t(DAY_LONG[h.weekday - 1]) : "";
                  const who = nameOf(h.staffId);
                  const disc = discOf(h.staffId);
                  return (
                    <Row key={h.id} cols={hourCols} first={i === 0} joined={same}>
                      <Cell strong title={day}>
                        {!same && <Text>{day}</Text>}
                      </Cell>
                      <Cell title={who}>
                        <span aria-hidden className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: disc.bg, color: disc.ink, fontSize: 11, lineHeight: "16px", fontWeight: 800 }}>
                          {initialsOf(who)}
                        </span>
                        <Text>{who}</Text>
                      </Cell>
                      <Cell>
                        <Text>{formatMinutes12(toMin(h.starts))}</Text>
                      </Cell>
                      <Cell>
                        <Text>{formatMinutes12(toMin(h.ends))}</Text>
                      </Cell>
                      <RowAction
                        label={t("Remove {name}'s {day} hours", { name: who, day: t(DAY_LONG[h.weekday - 1] ?? "") })}
                        icon={Trash2}
                        disabled={!online}
                        onClick={() => void removeHours(h)}
                      />
                    </Row>
                  );
                })}
              </Table>
            </>
          )}
        </div>
      </div>
      {businessId && (
        <ServiceSheet
          open={svc.open}
          service={svc.s}
          businessId={businessId}
          onClose={() => setSvc({ open: false, s: null })}
          onSaved={(m) => {
            setSvc({ open: false, s: null });
            showToast(m, false);
            void live.refresh();
          }}
        />
      )}
      {businessId && (
        <HoursSheet
          open={hoursOpen}
          businessId={businessId}
          people={d?.people ?? []}
          onClose={() => setHoursOpen(false)}
          onSaved={() => {
            setHoursOpen(false);
            showToast(t("Hours added."), false);
            void live.refresh();
          }}
        />
      )}
      {toast}
    </div>
  );
}

/** The Services table; its first column is 40% wide (34% at the rail). */
const ServicesTable: React.FC<{ services: Service[]; cols: string; onAdd: () => void; onEdit: (s: Service) => void }> = ({ services, cols: c, onAdd, onEdit }) => {
  return (
    <Table
      label={t("Services")}
      heads={[t("Service"), t("Duration"), t("Price"), t("Visibility")]}
      cols={c}
      onAdd={onAdd}
      empty={services.length === 0 ? { icon: HandHeart, title: t("No services yet"), body: t("Add what clients can book, with how long it takes and its price.") } : null}
    >
      {services.map((x, i) => (
        <Row key={x.id} cols={c} first={i === 0} onClick={() => onEdit(x)}>
          <Cell strong title={x.name}>
            <span className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: "#F0EDF9" }}>
              <HandHeart size={18} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
            </span>
            <Text>{x.name}</Text>
          </Cell>
          <Cell>
            <Text>{tn(x.durationMin, "{n} min", "{n} min")}</Text>
          </Cell>
          <Cell>
            <Text>{money(x.price)}</Text>
          </Cell>
          <Cell>
            <span
              className="shrink-0 whitespace-nowrap uppercase"
              style={{
                borderRadius: 999,
                fontSize: 11,
                lineHeight: "16px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                padding: "3px 10px",
                background: x.active ? "#E3F3E9" : "#F5F5F6",
                color: x.active ? "#2F7A52" : "#71685E",
              }}
            >
              {x.active ? t("Visible") : t("Hidden")}
            </span>
          </Cell>
          <RowAction label={t("Edit service")} icon={Pencil} onClick={() => onEdit(x)} />
        </Row>
      ))}
    </Table>
  );
};

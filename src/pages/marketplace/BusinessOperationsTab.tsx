import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Users, CalendarDays, ChevronRight, KeyRound, Store } from "lucide-react";
import { useBusinessNavKind } from "../../components/navigation/useBusinessNavKind";
import { ConsoleGate } from "../../components/business-console/ConsoleGate";
import { FrontDeskPage } from "../business-ops/frontdesk/FrontDeskPage";
import { MembershipsTab } from "../business-ops/plans";
import StoreOrdersPage from "../business-ops/store/StoreOrdersPage";
import AppointmentsPage from "../business-ops/appointments/AppointmentsPage";
import SchedulePage from "../business-ops/classes/SchedulePage";
import { t } from "../../i18n/core";

// v6 (V6-54, HANDOVER §5): the business navbar's per-type tab at
// /app/business/operations. ONE SHELL, ONE BRANCH PER TYPE: each Batch 4 area
// adds its own branch here and nothing else (re-read before editing).
// - gym: Front desk (Entries · Passes · Memberships), business-ops/frontdesk;
//   the Memberships tab is the plan list from business-ops/plans.
// - classes (Schedule), store (Orders), appointments: their areas' pages.
// - unknown type: the old landing below, until the type is known.
// B7: each branch is gated on the permission its readers ask business_can
// for (staff see the no-access card instead of an empty business); the gym
// Front desk's Memberships tab needs 'members' on top of 'front_desk'.
export default function BusinessOperationsTab() {
  const kind = useBusinessNavKind();
  if (kind === "gym")
    return (
      <ConsoleGate need={["front_desk", "members"]}>
        <FrontDeskPage memberships={<ConsoleGate need="members"><MembershipsTab /></ConsoleGate>} />
      </ConsoleGate>
    );
  // Batch 4 classes: Schedule (OP1-074 … 155), business-ops/classes.
  if (kind === "classes") return <ConsoleGate need="schedule"><SchedulePage /></ConsoleGate>;
  // Batch 4 store: Orders (To fulfil · Completed · Returns); a Wellness
  // Service with appointments only: Appointments (O11).
  if (kind === "store") return <ConsoleGate need="store"><StoreOrdersPage /></ConsoleGate>;
  if (kind === "appointments") return <ConsoleGate need="schedule"><AppointmentsPage /></ConsoleGate>;
  return <ConsoleGate need="owner"><OperationsLanding /></ConsoleGate>;
}

// V9 (QA 9.0): "Add a new button between analytics and marketplace called
// operations that house both the employees and classes buttons found in
// more" — a landing page for the two, freeing up bottom-nav room.
// V10 (QA 10.0): "a button that has to do with the gym itself" — membership
// plan management, added alongside Employees/Classes.
function OperationsLanding() {
  const navigate = useNavigate();
  const items = [
    // Stage A4: the venue console (hours, logo and cover, members, rosters).
    { key: "venues", icon: Store, label: t("Venues"), desc: t("Members, classes, hours & photos"), to: "/app/business/venue" },
    { key: "gym", icon: KeyRound, label: t("Gym"), desc: t("Manage membership plans & pricing"), to: "/app/business/gym" },
    { key: "employees", icon: Users, label: t("Employees"), desc: t("Affiliate professionals via your business ID"), to: "/app/business/employees" },
    { key: "classes", icon: CalendarDays, label: t("Classes"), desc: t("Schedule classes for affiliated professionals"), to: "/app/business/classes" },
  ];

  return (
    <div>
      <PageHeader title={t("Operations")} />
      <div className="space-y-2.5">
        {items.map((item) => (
          <Card
            key={item.key}
            interactive
            onClick={() => navigate(item.to)}
            className="flex items-center justify-between animate-fade-slide-up"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                <item.icon size={19} className="text-primary-dark" />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <p className="text-xs text-charcoal-faint">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint rtl:-scale-x-100" />
          </Card>
        ))}
      </div>
    </div>
  );
}

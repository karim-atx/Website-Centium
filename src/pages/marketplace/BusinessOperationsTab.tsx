import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Users, CalendarDays, ChevronRight, KeyRound } from "lucide-react";

// V9 (QA 9.0): "Add a new button between analytics and marketplace called
// operations that house both the employees and classes buttons found in
// more" — a landing page for the two, freeing up bottom-nav room.
// V10 (QA 10.0): "a button that has to do with the gym itself" — membership
// plan management, added alongside Employees/Classes.
export default function BusinessOperationsTab() {
  const navigate = useNavigate();
  const items = [
    { icon: KeyRound, label: "Gym", desc: "Manage membership plans & pricing", to: "/app/business/gym" },
    { icon: Users, label: "Employees", desc: "Affiliate professionals via your business ID", to: "/app/business/employees" },
    { icon: CalendarDays, label: "Classes", desc: "Schedule classes for affiliated professionals", to: "/app/business/classes" },
  ];

  return (
    <div>
      <PageHeader title="Operations" />
      <div className="space-y-2.5">
        {items.map((item) => (
          <Card
            key={item.label}
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
            <ChevronRight size={16} className="text-charcoal-faint" />
          </Card>
        ))}
      </div>
    </div>
  );
}

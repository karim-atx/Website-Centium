import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { Eye, MousePointerClick, Gift, Tag, Users, CalendarDays } from "lucide-react";

// V7 (QA 7.0): "New Analytics tab: business analytics tied to the Explore
// listing, with concrete example metrics." This prototype has no real
// traffic to measure, so listing views/clicks are a deterministic mock
// derived from membersReached (the one real-ish counter this app already
// tracks) — everything else (offerings/employees/classes) is a genuine
// count of the business's own actual data.
export default function BusinessAnalyticsTab() {
  const { businessListing, businessOfferings, businessEmployees, businessClasses, user } = useApp();
  const isGym = user.businessType === "gym";
  const myEmployees = user.businessId ? businessEmployees[user.businessId] ?? [] : [];

  const views = businessListing.membersReached * 6 + 128;
  const clicks = Math.round(views * 0.18);
  const redemptions = businessListing.membersReached;

  const stats = [
    { icon: Eye, label: "Listing views (30d)", value: views.toLocaleString() },
    { icon: MousePointerClick, label: "Listing taps (30d)", value: clicks.toLocaleString() },
    { icon: Gift, label: "Perk redemptions", value: redemptions.toLocaleString() },
    { icon: Tag, label: "Active listings", value: businessOfferings.length },
    ...(isGym
      ? [
          { icon: Users, label: "Affiliated professionals", value: myEmployees.length },
          { icon: CalendarDays, label: "Classes scheduled", value: businessClasses.length },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="How your Explore listing is performing" />

      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <Card key={s.label} className="animate-fade-slide-up">
            <s.icon size={16} className="text-primary mb-2" />
            <p className="text-xl font-bold text-charcoal">{s.value}</p>
            <p className="text-[11px] text-charcoal-faint leading-tight mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <p className="text-[11px] text-charcoal-faint text-center mt-6">
        Prototype metrics — production Centium will report real traffic from the Explore tab.
      </p>
    </div>
  );
}

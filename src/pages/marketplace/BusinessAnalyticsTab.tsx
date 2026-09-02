import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import {
  Eye,
  MousePointerClick,
  Gift,
  Tag,
  Users,
  CalendarDays,
  Percent,
  Star,
  KeyRound,
  Wallet,
  Repeat,
  UserCheck,
  Gauge,
  AlertTriangle,
  ChevronRight,
  Download,
  ClipboardCheck,
  Salad,
  HeartPulse,
  Stethoscope,
} from "lucide-react";

// QA 13.0: "In this tab revamp everything and instead adopt the following...
// Separate between, Business Insights that has revenue, leads,
// memberships, utilization, staff, classes, retention and Client Outcomes
// that has adherence, progress, recovery, nutrition consistency,
// treatment/rehab outcomes, and clients needing review."
//
// This prototype has no real payments/booking/CRM backend, so every figure
// below is a deterministic mock — either a genuine count of the business's
// own data (offerings/employees/classes/membership plans) or a number
// derived from `membersReached` (the one real-ish counter this app already
// tracks) using the illustrative ratios from the QA spec's own worked
// examples. A real backend would compute these from payment, booking and
// check-in history instead.
const periods = ["Today", "This week", "This month", "This quarter"] as const;
type Period = (typeof periods)[number];
const periodDivisor: Record<Period, number> = {
  Today: 30,
  "This week": 4.3,
  "This month": 1,
  "This quarter": 1 / 3,
};

const insightActions: { label: string; action: string }[] = [
  { label: "Declining training adherence", action: "Review client timeline, send check-in, adjust plan, book review." },
  { label: "Payment failure", action: "Retry payment, send reminder, suspend renewal flow if appropriate." },
  { label: "Low class fill", action: "Promote to eligible members, change time, combine or cancel class." },
  { label: "Low lead response rate", action: "Assign staff member, create follow-up task, send booking link." },
  { label: "Physio outcome worsening", action: "Flag for clinician review; avoid automatic diagnosis or treatment advice." },
  { label: "Capacity issue", action: "Open availability, change staff coverage, add sessions or waitlist." },
];

const adherenceBuckets = [
  { range: "0–24%", count: 6, color: "#C0392B" },
  { range: "25–49%", count: 14, color: "#D9A441" },
  { range: "50–74%", count: 31, color: "#6F9993" },
  { range: "75–100%", count: 79, color: "#3F9165" },
];

const atRiskClients = [
  { name: "Rana K.", concern: "High", reason: "No class attendance for 12 days, one missed PT session, membership renews in 6 days." },
  { name: "Elie H.", concern: "High", reason: "Two consecutive missed bookings and a failed renewal payment." },
  { name: "Yara B.", concern: "Moderate", reason: "Declining visit frequency over the last four weeks." },
];

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function BusinessAnalyticsTab() {
  const { businessListing, businessOfferings, businessEmployees, businessClasses, professionalReviews, user } = useApp();
  const isGym = user.businessType === "gym";
  const myEmployees = user.businessId ? businessEmployees[user.businessId] ?? [] : [];

  const [section, setSection] = useState<"insights" | "outcomes">("insights");
  const [period, setPeriod] = useState<Period>("This month");
  const [openInsight, setOpenInsight] = useState<(typeof insightActions)[number] | null>(null);
  const [atRiskOpen, setAtRiskOpen] = useState(false);

  const members = Math.max(businessListing.membersReached, 24);
  const mrr = Math.round((members * 43.1) / periodDivisor[period]);
  const totalRevenue = Math.round(mrr * 1.24);
  const newLeads = Math.max(6, Math.round(members * 0.1));
  const leadsSigned = Math.round(newLeads * 0.256);
  const conversionPct = newLeads > 0 ? Math.round((leadsSigned / newLeads) * 100) : 0;
  const atRiskCount = atRiskClients.length + Math.max(0, Math.round(members * 0.03));

  const businessKpis = [
    { icon: Users, label: "Active clients/members", value: members.toLocaleString(), sub: "+6.2% vs prior period" },
    { icon: Repeat, label: "Monthly recurring revenue", value: `$${mrr.toLocaleString()}`, sub: "+4.1% vs prior period" },
    { icon: Wallet, label: "Total revenue", value: `$${totalRevenue.toLocaleString()}`, sub: period },
    { icon: UserCheck, label: "Retention / churn", value: "92% / 3.1%", sub: "Indicates whether clients stay" },
    { icon: Tag, label: "Leads / conversion", value: `${newLeads} · ${leadsSigned} signed`, sub: `${conversionPct}% conversion` },
    { icon: CalendarDays, label: "Attendance / engagement", value: "3.1 visits", sub: "per member this month" },
    { icon: Gauge, label: "Capacity / utilization", value: "78%", sub: "Appointment utilization" },
    { icon: AlertTriangle, label: "At-risk clients", value: `${atRiskCount} need follow-up`, sub: "Tap to see who and why" },
  ];

  const adherenceTotal = adherenceBuckets.reduce((s, b) => s + b.count, 0);

  const clientOutcomeKpis = [
    { icon: ClipboardCheck, label: "80%+ session adherence", value: "61%", sub: "Of active clients" },
    { icon: Salad, label: "Nutrition logging adherence", value: "54%", sub: "Where shared & relevant" },
    { icon: HeartPulse, label: "Avg recovery/readiness trend", value: "Stable", sub: "Self-reported, last 4 weeks" },
    { icon: Stethoscope, label: "Treatment/rehab outcomes", value: "Improving", sub: "Physio & rehab caseload" },
  ];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Business performance and client outcomes" />

      <div className="flex gap-2 mb-4">
        <Chip active={section === "insights"} onClick={() => setSection("insights")}>
          Business Insights
        </Chip>
        <Chip active={section === "outcomes"} onClick={() => setSection("outcomes")}>
          Client Outcomes
        </Chip>
      </div>

      {/* QA 13.0: "Show filters for period, location, practitioner,
          product/service, membership type, and client segment." This
          prototype only has one business/location and no real staff
          roster tied to bookings, so only the period filter is
          functional — the rest would need real multi-location/staff data
          to mean anything. */}
      {section === "insights" && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          {periods.map((p) => (
            <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
              {p}
            </Chip>
          ))}
        </div>
      )}

      {section === "insights" && (
        <>
          <div className="flex items-center justify-between mb-2.5">
            <p className="section-label text-charcoal-faint">Business performance</p>
            <button
              onClick={() =>
                downloadCsv(
                  "centium-business-insights.csv",
                  [["Metric", "Value", "Detail"], ...businessKpis.map((k) => [k.label, k.value, k.sub])]
                )
              }
              className="tap flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-dark"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {businessKpis.map((k) => (
              <Card
                key={k.label}
                interactive={k.label === "At-risk clients"}
                onClick={k.label === "At-risk clients" ? () => setAtRiskOpen(true) : undefined}
                className="animate-fade-slide-up"
              >
                <k.icon size={16} className="text-primary mb-2" />
                <p className="text-lg font-bold text-charcoal leading-tight">{k.value}</p>
                <p className="text-[11px] font-semibold text-charcoal-soft leading-tight mt-1">{k.label}</p>
                <p className="text-[10.5px] text-charcoal-faint leading-tight mt-0.5">{k.sub}</p>
              </Card>
            ))}
          </div>

          {/* QA 13.0: "Each card should be clickable and open a filtered
              list with recommended actions." */}
          <p className="section-label text-charcoal-faint mb-2.5">Needs attention</p>
          <Card padded={false} className="mb-6 divide-y divide-charcoal/[0.04]">
            {insightActions.map((i) => (
              <button
                key={i.label}
                onClick={() => setOpenInsight(i)}
                className="tap w-full flex items-center justify-between px-4 py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-charcoal">{i.label}</span>
                <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
              </button>
            ))}
          </Card>

          <p className="section-label text-charcoal-faint mb-2.5">Marketplace listing performance</p>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { icon: Eye, label: "Listing views (30d)", value: (businessListing.membersReached * 6 + 128).toLocaleString() },
              { icon: MousePointerClick, label: "Listing taps (30d)", value: Math.round((businessListing.membersReached * 6 + 128) * 0.18).toLocaleString() },
              { icon: Gift, label: "Perk redemptions", value: businessListing.membersReached.toLocaleString() },
              { icon: Percent, label: "Tap-to-redeem rate", value: `${conversionPct}%` },
              {
                icon: Star,
                label: "Average rating",
                value: professionalReviews.find((r) => r.professionalId === "my-business")?.rating.toFixed(1) ?? "—",
              },
              { icon: Tag, label: "Active listings", value: businessOfferings.length },
              ...(isGym
                ? [
                    { icon: KeyRound, label: "Membership plans", value: businessListing.membershipPlans.length },
                    { icon: Users, label: "Affiliated professionals", value: myEmployees.length },
                    { icon: CalendarDays, label: "Classes scheduled", value: businessClasses.length },
                  ]
                : []),
            ].map((s) => (
              <Card key={s.label} className="animate-fade-slide-up">
                <s.icon size={16} className="text-primary mb-2" />
                <p className="text-xl font-bold text-charcoal">{s.value}</p>
                <p className="text-[11px] text-charcoal-faint leading-tight mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {section === "outcomes" && (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {clientOutcomeKpis.map((k) => (
              <Card key={k.label} className="animate-fade-slide-up">
                <k.icon size={16} className="text-primary mb-2" />
                <p className="text-lg font-bold text-charcoal leading-tight">{k.value}</p>
                <p className="text-[11px] font-semibold text-charcoal-soft leading-tight mt-1">{k.label}</p>
                <p className="text-[10.5px] text-charcoal-faint leading-tight mt-0.5">{k.sub}</p>
              </Card>
            ))}
          </div>

          {/* QA 13.0: "Averages can mislead... include a distribution
              chart that immediately identifies how many people may need
              extra support." */}
          <p className="section-label text-charcoal-faint mb-2.5">Adherence distribution</p>
          <Card className="mb-6">
            <div className="space-y-2.5">
              {adherenceBuckets.map((b) => (
                <div key={b.range} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-charcoal-soft w-14 shrink-0">{b.range}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-cream-soft overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(b.count / adherenceTotal) * 100}%`, background: b.color }}
                    />
                  </div>
                  <span className="text-xs font-bold text-charcoal w-16 text-right shrink-0">{b.count} clients</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-charcoal-faint leading-relaxed mt-3 pt-3 border-t border-charcoal/[0.06]">
              An average adherence rate can hide who actually needs support — {adherenceBuckets[0].count + adherenceBuckets[1].count} of{" "}
              {adherenceTotal} clients are below 50%.
            </p>
          </Card>

          {/* QA 13.0: "Create a transparent, configurable engagement score
              rather than a black-box prediction model. Show why the
              client is flagged." */}
          <button
            onClick={() => setAtRiskOpen(true)}
            className="tap w-full flex items-center justify-between rounded-2xl bg-cream-card border border-charcoal/[0.11] px-4 py-3.5 mb-4"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-teal-pale flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-teal-dark" />
              </span>
              <span className="text-left">
                <span className="text-sm font-bold text-charcoal block">Clients needing review</span>
                <span className="text-xs text-charcoal-faint block">{atRiskCount} flagged — tap to see why</span>
              </span>
            </span>
            <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
          </button>
        </>
      )}

      <p className="text-[11px] text-charcoal-faint text-center mt-2">
        Prototype metrics — production Centium will report real revenue, booking and adherence data.
      </p>

      <BottomSheet open={!!openInsight} onClose={() => setOpenInsight(null)} title={openInsight?.label}>
        <p className="text-sm text-charcoal-soft leading-relaxed animate-fade-slide-up">{openInsight?.action}</p>
      </BottomSheet>

      <BottomSheet open={atRiskOpen} onClose={() => setAtRiskOpen(false)} title="Clients needing review">
        <div className="space-y-2.5 animate-fade-slide-up">
          {atRiskClients.map((c) => (
            <Card key={c.name}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold text-charcoal">{c.name}</p>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                    c.concern === "High" ? "bg-teal-pale text-teal-dark" : "bg-gold-pale text-charcoal"
                  }`}
                >
                  {c.concern} concern
                </span>
              </div>
              <p className="text-xs text-charcoal-soft leading-relaxed">At risk: {c.reason}</p>
            </Card>
          ))}
          <p className="text-[11px] text-charcoal-faint leading-relaxed pt-1">
            Flags are based on visible signals (attendance, bookings, payments) — not a diagnosis or a
            black-box score.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}

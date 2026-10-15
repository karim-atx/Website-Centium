import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailPlus, Ticket, Users } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { useIsDark } from "../../../hooks/useIsDark";
import { AnCard, AnEmptyCard, AnHeaderRow, AnLead, AnNumberBoxes } from "./anKit";
import { planBars, type Delta, type MembersFigures, type MembersPageDef, type MembersVocab, type PageView } from "./membersModel";
import type { MembersData } from "./useMembersData";
import { useAnalytics } from "../analyticsContext";
import { RenewalsCard } from "./RenewalsCard";
import { GrowthChart } from "./GrowthChart";

// A Members section page (AN4-005 rows 10-17: back 44, crumb, the picker
// title (AN4-046 / -047: one navigation pattern, the picker), "{i} of {n}",
// the section card with its two number boxes and lead). The boxes and lead
// come from the B15 readers (membersModel pageView); a value no reader gives
// reads "–" (tert). Growth draws the weekly chart from business_member_growth
// (GrowthChart, AN4-005 rows 18-33), or the empty chart frame (AN4-023 row 11)
// while it has no weeks; Plans draws the per-plan bars from
// business_plan_figures (AnMembersV6 l.180-188) and the member-codes redeemed
// share (AN4-013 row 19a). With no member ever (B7 list_business_members
// total_count, `empty`), a section shows the AN4-023 empty card instead
// (Growth with its ghost chart), the same card as the index (AN4-043).

const BASE = "/app/business/analytics/members";

/** AN4-005 row 16a / AN4-001 row 15 delta inks: good, high, faint. */
export function DeltaText({ d }: { d: Delta }) {
  return <span className={d.tone === "good" ? "text-status-good" : d.tone === "high" ? "text-status-high" : "text-charcoal-faint"}>{d.t}</span>;
}

// AnMembersV6 l.240-241: plan bar colours cycle primary, teal, caution.
const PLAN_L = ["#AEA1DC", "#14A08F", "#D9A441"];
const PLAN_D = ["#A991FE", "#4FD1C0", "#E0B360"];

export function MembersPage({
  page,
  pages,
  vocab,
  view,
  figures,
  data,
  empty = false,
}: {
  page: MembersPageDef;
  pages: MembersPageDef[];
  vocab: MembersVocab;
  view: PageView;
  figures: MembersFigures;
  data: MembersData;
  /** No member ever (AN4-023 O2): the section empty card. */
  empty?: boolean;
}) {
  const navigate = useNavigate();
  const dark = useIsDark();
  const { range } = useAnalytics();
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const i = pages.findIndex((p) => p.key === page.key);
  const codes = data.codes ?? [];
  const redeemed = codes.filter((c) => c.redeemed).length;
  const growth = page.key === "growth" && vocab.label === "Members" ? figures.growth : null;
  const bars = page.key === "plans" && figures.plans ? planBars(figures.plans) : [];

  return (
    <div>
      <AnHeaderRow
        crumb={vocab.label}
        backLabel={`Back to ${vocab.label}`}
        onBack={() => navigate(BASE)}
        title={page.title}
        position={`${i + 1} of ${pages.length}`}
        picker={{ open: !!picker, onToggle: (el) => setPicker((p) => (p ? null : el)) }}
      />
      <PopupMenu
        open={!!picker}
        onClose={() => setPicker(null)}
        anchor={picker}
        variant="field"
        width={224}
        align="left"
        heading={`${vocab.label} sections`}
        options={pages.map((p) => ({ value: p.key, label: p.title }))}
        selected={page.key}
        onSelect={(k) => {
          setPicker(null);
          navigate(`${BASE}/${k}`);
        }}
      />

      {empty ? (
        <AnEmptyCard
          icon={Users}
          ghost={page.key === "growth"}
          title={`No ${vocab.people} yet`}
          body="Invite members with a code. Growth, first-90-day health, engagement and plans appear once people join."
          button={{ label: "Invite members", icon: MailPlus, onClick: () => navigate(`${BASE}/codes?create=1`) }}
        />
      ) : (
        <AnCard label={page.title}>
          <AnNumberBoxes
            boxes={[
              { label: view.boxes[0].label, value: view.boxes[0].value, delta: view.boxes[0].delta ? <DeltaText d={view.boxes[0].delta} /> : undefined },
              { label: view.boxes[1].label, value: view.boxes[1].value, delta: view.boxes[1].delta ? <DeltaText d={view.boxes[1].delta} /> : undefined },
            ]}
          />
          <AnLead>{view.lead}</AnLead>
          {growth && growth.cur.length > 0 ? (
            <GrowthChart cur={growth.cur} prev={growth.prev} endsThisWeek /* business_member_growth always ends with this week */ />
          ) : (
            page.key === "growth" && (
              <div className="border-t border-charcoal/[0.06]" style={{ padding: "12px 16px 12px" }} aria-hidden>
                <svg width="100%" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" className="overflow-visible">
                  <line x1="0" x2="300" y1="14" y2="14" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <line x1="0" x2="300" y1="44" y2="44" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  <line x1="0" x2="300" y1="74" y2="74" className="stroke-charcoal-tertiary" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            )
          )}
          {bars.length > 0 && (
            <div data-plan-bars className="border-t border-charcoal/[0.06]" style={{ padding: "12px 16px 10px" }}>
              {bars.map((b, k) => (
                <div key={b.key} className="grid items-center" style={{ gridTemplateColumns: "96px minmax(0,1fr) 30px", gap: 10, height: 30 }} aria-label={`${b.t}: ${b.n} ${b.n === 1 ? vocab.one : vocab.people}`}>
                  <span className="text-charcoal" style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" }}>
                    {b.t}
                  </span>
                  <div style={{ height: 8, borderRadius: 999, background: dark ? "#262932" : "#F5F5F6", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: b.w, borderRadius: 999, background: (dark ? PLAN_D : PLAN_L)[k % 3] }} />
                  </div>
                  <span className="text-charcoal" style={{ fontSize: 12, fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {b.n}
                  </span>
                </div>
              ))}
            </div>
          )}
          {page.key === "plans" && codes.length > 0 && (
            <button
              type="button"
              onClick={() => navigate(`${BASE}/codes`)}
              className="tap w-full flex items-center gap-[10px] border-t border-charcoal/[0.06] text-left min-h-[56px]"
              style={{ padding: "12px 20px" }}
            >
              <span aria-hidden className="w-[3px] self-stretch rounded-full bg-primary-dark" />
              <Ticket size={16} aria-hidden className="text-primary-dark shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-[17px] font-extrabold text-charcoal">Member codes redeemed</span>
                <span className="block text-[11px] leading-[15px] text-charcoal-faint">Codes handed out at the desk and used to join.</span>
              </span>
              <span className="text-[16px] font-extrabold tabular-nums text-charcoal">
                {redeemed}/{codes.length}
              </span>
            </button>
          )}
        </AnCard>
      )}
      {/* OURS-AN4-gym-variant row 17 (B7 MB-05): the gym Plans page's Renewals block. */}
      {page.key === "plans" && vocab.label === "Members" && !empty && <RenewalsCard from={range.from} to={range.to} />}
    </div>
  );
}


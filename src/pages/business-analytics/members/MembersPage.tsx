import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailPlus, ScanLine, Ticket, Users } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { AnCard, AnEmptyCard, AnHeaderRow, AnHintBox, AnLead, AnNumberBoxes } from "./anKit";
import { activeValue, type MembersPageDef, type MembersVocab } from "./membersModel";
import type { MembersData } from "./useMembersData";
import { useAnalytics } from "../analyticsContext";
import { RenewalsCard } from "./RenewalsCard";

// A Members section page (AN4-005 rows 10-17: back 44, crumb, the picker
// title (AN4-046 / -047: one navigation pattern, the picker), "{i} of {n}",
// the section card with its two number boxes and lead). The B7 readers are
// not on the local stack, so the boxes read "–" (tert) and the lead says
// what is coming; the Growth page keeps the empty chart frame (AN4-023 row
// 11). Visits and Not seen in 14 days wait for check-ins (gym variant row
// 18). Plans shows the plan count (live) and the member-codes redeemed share
// (AN4-013 row 19a, live). With no member ever (B7 list_business_members
// total_count, `empty`), a section shows the AN4-023 empty card instead
// (Growth with its ghost chart), the same card as the index (AN4-043).

const BASE = "/app/business/analytics/members";

export function MembersPage({
  page,
  pages,
  vocab,
  plansCount,
  data,
  empty = false,
}: {
  page: MembersPageDef;
  pages: MembersPageDef[];
  vocab: MembersVocab;
  plansCount: number;
  data: MembersData;
  /** No member ever (AN4-023 O2): the section empty card. */
  empty?: boolean;
}) {
  const navigate = useNavigate();
  const { range } = useAnalytics();
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const i = pages.findIndex((p) => p.key === page.key);
  const codes = data.codes ?? [];
  const redeemed = codes.filter((c) => c.redeemed).length;

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

      {empty && page.waits !== "check-ins" ? (
        <AnEmptyCard
          icon={Users}
          ghost={page.key === "growth"}
          title={`No ${vocab.people} yet`}
          body="Invite members with a code. Growth, first-90-day health, engagement and plans appear once people join."
          button={{ label: "Invite members", icon: MailPlus, onClick: () => navigate(`${BASE}/codes?create=1`) }}
        />
      ) : page.waits === "check-ins" ? (
        <>
          <AnHintBox>{page.coming}</AnHintBox>
          <AnEmptyCard
            icon={ScanLine}
            title="Visits appear here once check-ins start"
            body="Check-ins are on the way. Visit counts, quiet members and busy days will show here when your front desk starts checking people in."
          />
        </>
      ) : (
        <AnCard label={page.title}>
          <AnNumberBoxes
            boxes={[
              { label: page.boxes[0], value: page.key === "plans" ? plansCount.toLocaleString() : activeValue(page, vocab, data) },
              { label: page.boxes[1], value: null },
            ]}
          />
          <AnLead>{page.coming}</AnLead>
          {page.key === "growth" && (
            <div className="border-t border-charcoal/[0.06]" style={{ padding: "12px 16px 12px" }} aria-hidden>
              <svg width="100%" height="96" viewBox="0 0 300 96" preserveAspectRatio="none" className="overflow-visible">
                <line x1="0" x2="300" y1="14" y2="14" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <line x1="0" x2="300" y1="44" y2="44" className="stroke-charcoal/[0.07]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <line x1="0" x2="300" y1="74" y2="74" className="stroke-charcoal-tertiary" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              </svg>
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

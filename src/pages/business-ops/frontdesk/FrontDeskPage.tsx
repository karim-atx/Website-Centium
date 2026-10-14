import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, ScanLine } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { clock12 } from "../../../utils/time12";
import { CheckInSheet } from "./CheckInSheet";
import { EntriesTab } from "./EntriesTab";
import { DeskHeader, FixedCta, HeaderIconButton, TextTabs } from "./frontDeskKit";
import { PassesTab } from "./PassesTab";
import { ScanSheet } from "./ScanSheet";
import { useFrontDesk } from "./useFrontDesk";

// v6 Batch 4 · Gym › Front desk (V6-54): the gym's navbar tab
// (/app/business/operations), text tabs Entries · Passes · Memberships.
// OP1-013 / 015 / 016 / 017 / 019 and OURS-OP1-front-desk-scan; the
// Memberships tab is the plan list (OP1-022, built under business-ops/plans
// and handed in as `memberships`). The chosen tab lives in ?tab= so Back
// returns to it (OP1-013 S1). A gym that runs classes (it has class rows)
// gets a "Class schedule" button beside Scan: the Schedule at
// /app/business/classes is otherwise reachable only by URL for a gym (OURS).

export type DeskTab = "entries" | "passes" | "memberships";
const TABS: { key: DeskTab; label: string }[] = [
  { key: "entries", label: "Entries" },
  { key: "passes", label: "Passes" },
  { key: "memberships", label: "Memberships" },
];
const TITLE: Record<DeskTab, string> = {
  entries: "Front desk",
  passes: "Passes and renewals",
  memberships: "Memberships",
};

export const FrontDeskPage: React.FC<{ memberships: React.ReactNode }> = ({ memberships }) => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: DeskTab = raw === "passes" || raw === "memberships" ? raw : "entries";
  const setTab = (t: DeskTab) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (t === "entries") n.delete("tab");
        else n.set("tab", t);
        return n;
      },
      { replace: true }
    );

  const navigate = useNavigate();
  const online = useOnline();
  const data = useFrontDesk();
  const gymIds = useMemo(() => data.venues.map((v) => v.gymId), [data.venues]);
  const [opened] = useState(() => new Date());
  const now = data.loadedAt ?? opened;
  const [checkIn, setCheckIn] = useState<{ open: boolean; membershipId: string | null }>({ open: false, membershipId: null });
  const [scan, setScan] = useState(false);

  const offlineLine =
    !online && data.loadedAt && tab !== "memberships"
      ? tab === "entries"
        ? `Offline. Showing entries from ${clock12(data.loadedAt)}.`
        : `Offline. Showing data from ${clock12(data.loadedAt)}.`
      : null;

  return (
    <div style={{ paddingBottom: tab === "entries" ? 48 : 0 }}>
      <DeskHeader
        kicker="Front desk"
        title={TITLE[tab]}
        sub={tab === "memberships" ? "Membership plans clients can buy on Explore" : undefined}
        action={
          <div className="flex shrink-0" style={{ gap: 4 }}>
            {data.runsClasses && <HeaderIconButton icon={CalendarDays} label="Class schedule" edge={false} onClick={() => navigate("/app/business/classes")} />}
            <HeaderIconButton icon={ScanLine} label="Scan a pass" onClick={() => setScan(true)} />
          </div>
        }
      />
      <TextTabs tabs={TABS} value={tab} onChange={setTab} label="Front desk" />
      {offlineLine && (
        <p role="status" className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ margin: "-6px 2px 12px" }}>
          {offlineLine}
        </p>
      )}
      <div role="tabpanel" id={`fd-panel-${tab}`} aria-labelledby={`fd-tab-${tab}`}>
        {tab === "entries" && <EntriesTab entries={data.entries} loading={data.loading} error={data.error} onRetry={data.reload} now={now} />}
        {tab === "passes" && <PassesTab renewals={data.renewals} loading={data.loading} error={data.error} onRetry={data.reload} online={online} onChanged={data.reload} planTerms={data.planTerms} />}
        {tab === "memberships" && memberships}
      </div>

      {tab === "entries" && <FixedCta variant="kit" label="Check someone in" onClick={() => setCheckIn({ open: true, membershipId: null })} />}

      <CheckInSheet
        open={checkIn.open}
        initialMembershipId={checkIn.membershipId}
        onClose={() => setCheckIn({ open: false, membershipId: null })}
        gymIds={gymIds}
        members={data.members}
        online={online}
        onScanInstead={() => {
          setCheckIn({ open: false, membershipId: null });
          setScan(true);
        }}
      />
      <ScanSheet
        open={scan}
        onClose={() => setScan(false)}
        online={online}
        onChanged={data.reload}
        onCheckInByName={(id) => {
          setScan(false);
          setCheckIn({ open: true, membershipId: id ?? null });
        }}
      />
    </div>
  );
};

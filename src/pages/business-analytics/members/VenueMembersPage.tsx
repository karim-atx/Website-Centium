import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { VenueMembersRoster } from "../../../components/marketplace/VenueMembersRoster";
import { VSkeletonRows, useOpsToast } from "../../../components/marketplace/VenueKit";
import { useMyVenues } from "../../../hooks/useMyVenues";
import { AnEmptyCard, AnHeaderRow, AnStrip } from "./anKit";
import type { MembersVocab } from "./membersModel";

// Analytics › Members › Venue members (OURS-AN4-member-rosters rows 1-18):
// the AN4 page header with the venue as the title (a picker with two or more
// venues, AN4-047's listbox), then THE one roster component (V6-163, Q-R1:
// OP1 083 rows, K14 status tabs, paging, Mark as paid) and the footer line
// saying what the venue is told.

export function VenueMembersPage({ vocab }: { vocab: MembersVocab }) {
  const navigate = useNavigate();
  const { venues, selected, select, loading, error, reload } = useMyVenues();
  const [picker, setPicker] = useState<HTMLElement | null>(null);
  const [toast, showToast] = useOpsToast();
  const many = venues.length > 1;

  return (
    <div>
      <AnHeaderRow
        crumb={vocab.label}
        backLabel={`Back to ${vocab.label}`}
        onBack={() => navigate("/app/business/analytics/members")}
        title={selected?.name ?? "Venue members"}
        picker={many ? { open: !!picker, onToggle: (el) => setPicker((p) => (p ? null : el)) } : undefined}
      />
      {many && (
        <PopupMenu
          open={!!picker}
          onClose={() => setPicker(null)}
          anchor={picker}
          variant="field"
          width={224}
          align="left"
          heading="Venues"
          options={venues.map((v) => ({ value: v.gymId, label: v.name }))}
          selected={selected?.gymId ?? null}
          onSelect={(id) => {
            setPicker(null);
            select(id);
          }}
        />
      )}
      {error && venues.length === 0 && <AnStrip text={error} onRetry={reload} />}
      {loading && venues.length === 0 && !error && <VSkeletonRows rows={5} pill />}
      {!loading && venues.length === 0 && !error && (
        <AnEmptyCard icon={Store} title="No venues yet" body="You don't run or work at a venue on Centium yet." />
      )}
      {selected && (
        <>
          <VenueMembersRoster key={selected.gymId} gymId={selected.gymId} mode="page" onToast={showToast} />
          <p className="text-[10.5px] leading-[15px] text-charcoal-faint text-center mt-[10px]">First names only. Members under 18 are marked.</p>
        </>
      )}
      {toast}
    </div>
  );
}

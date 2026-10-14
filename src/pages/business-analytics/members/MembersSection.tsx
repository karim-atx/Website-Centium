import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { MailPlus, ShoppingBag, Users } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { useAnalytics } from "../analyticsContext";
import { AnCard, AnEmptyCard, AnHint, AnIndexRow, AnIndexSkeleton, AnStrip } from "./anKit";
import { pagesOf, vocabOf } from "./membersModel";
import { liveCodes, useMembersData } from "./useMembersData";
import { MembersPage } from "./MembersPage";
import { MemberCodesPage } from "./MemberCodesPage";
import { VenueMembersPage } from "./VenueMembersPage";

// Analytics › Members (AN4): the section index (AN4-001), the section pages
// (AN4-005 …, MembersPage), Member codes (OURS-AN4-member-codes with the
// OP1 End pop-up) and the venue roster page (OURS-AN4-member-rosters, the
// one roster component). Routes: /app/business/analytics/members[/<page> |
// /codes | /venue]. Per type: Gym "Members", Classes "Clients", Store
// "Customers" (orders are BU5-15, so Store shows its coming card only).

const BASE = "/app/business/analytics/members";

export function MembersSection() {
  const params = useParams();
  const sub = (params["*"] ?? "").replace(/\/+$/, "");
  const { kind, setExport } = useAnalytics();
  const navigate = useNavigate();
  const online = useOnline();
  const data = useMembersData();
  const vocab = vocabOf(kind);
  const pages = useMemo(() => pagesOf(kind), [kind]);

  const waiting = data.codes ? liveCodes(data.codes).length : null;
  const activeAtVenues = data.venues.reduce((s, v) => s + v.activeMembers, 0);
  const anyMembers = (data.members?.length ?? 0) > 0 || data.venues.some((v) => v.activeMembers > 0 || v.membershipsAwaitingPayment > 0);
  const known = !data.loading && !data.venuesLoading && (data.members !== null || !data.businessId);
  const empty = kind !== "classes" && known && !anyMembers;

  // Export CSV: the index rows as they are (coming values export as empty cells, never 0).
  useEffect(() => {
    if (sub) return;
    if (kind === "store" || !known) {
      setExport("", null);
      return;
    }
    setExport(`centium-${vocab.people}.csv`, [
      ["Section", "Value", "Note"],
      ...pages.map((p) => [p.title, p.key === "plans" ? data.plans.length : null, p.coming]),
      ["Member codes waiting", waiting, null],
      ...(data.venues.length > 0 ? [["Active at your venues", activeAtVenues, null]] : []),
    ]);
    return () => setExport("", null);
  }, [sub, kind, known, pages, data.plans.length, waiting, activeAtVenues, data.venues.length, vocab.people, setExport]);

  if (sub === "codes") return <MemberCodesPage data={data} vocab={vocab} />;
  if (sub === "venue") return <VenueMembersPage vocab={vocab} />;
  if (sub) {
    const page = pages.find((p) => p.key === sub);
    if (!page) return <Navigate to={BASE} replace />;
    return <MembersPage page={page} pages={pages} vocab={vocab} plansCount={data.plans.length} data={data} />;
  }

  if (kind === "store") {
    return (
      <AnEmptyCard icon={ShoppingBag} title="No customers yet" body="Customers appear here once your first orders come in." />
    );
  }

  const codesLine = waiting === null ? "Create a code for each new member." : waiting > 0 ? `${waiting} waiting to be used` : "Create a code for each new member.";

  return (
    <div>
      {data.error && <AnStrip offline={!online} text={online ? `Couldn't load your ${vocab.people}. Check your connection and try again.` : `You're offline. Showing ${vocab.people} as of your last visit.`} onRetry={data.reload} />}

      {empty ? (
        <AnEmptyCard
          icon={Users}
          title={`No ${vocab.people} yet`}
          body="Invite members with a code. Growth, first-90-day health, engagement and plans appear once people join."
          button={{ label: "Invite members", icon: MailPlus, onClick: () => navigate(`${BASE}/codes?create=1`) }}
        >
          {!!waiting && (
            <button type="button" onClick={() => navigate(`${BASE}/codes`)} className="tap min-h-[44px] text-[12px] leading-[17px] text-charcoal-faint underline-offset-2 hover:underline">
              {waiting === 1 ? "1 code waiting to be used." : `${waiting} codes waiting to be used.`}
            </button>
          )}
        </AnEmptyCard>
      ) : (
        <>
          <AnCard label={`${vocab.label} sections`}>
            {!known ? (
              <AnIndexSkeleton rows={pages.length} />
            ) : (
              pages.map((p, i) => {
                const value = p.key === "plans" ? data.plans.length.toLocaleString() : null;
                return (
                  <AnIndexRow
                    key={p.key}
                    first={i === 0}
                    title={p.title}
                    lead={p.coming}
                    value={value}
                    onClick={() => navigate(`${BASE}/${p.key}`)}
                    ariaLabel={`${p.title}: ${value ? `${value} ${p.boxes[0]}` : "coming soon"}`}
                  />
                );
              })
            )}
          </AnCard>
          {known && <AnHint>Tap a section to open its page.</AnHint>}
        </>
      )}

      {/* OURS-AN4-member-codes row 1: Member codes (owner only; analytics is the owner's). */}
      {known && (
        <AnCard className="mt-[12px]" label="Member codes">
          <AnIndexRow
            first
            title="Member codes"
            lead={codesLine}
            value={waiting === null ? null : waiting.toLocaleString()}
            onClick={() => navigate(`${BASE}/codes`)}
            ariaLabel={`Member codes: ${waiting ?? 0} waiting to be used`}
          />
        </AnCard>
      )}

      {/* OURS-AN4-member-rosters: Venue members (any business with venues). */}
      {known && data.venues.length > 0 && (
        <AnCard className="mt-[12px]" label="Venue members">
          <AnIndexRow
            first
            title="Venue members"
            lead={data.venues.length === 1 ? `${activeAtVenues} active at ${data.venues[0].name}` : `${activeAtVenues} active across ${data.venues.length} venues`}
            value={activeAtVenues.toLocaleString()}
            onClick={() => navigate(`${BASE}/venue`)}
            ariaLabel={`Venue members: ${activeAtVenues} active`}
          />
        </AnCard>
      )}
    </div>
  );
}

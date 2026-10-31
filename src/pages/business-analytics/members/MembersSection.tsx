import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useOnline } from "../../../hooks/useOnline";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useAnalytics } from "../analyticsContext";
import { AnCard, AnEarlyHint, AnHint, AnIndexRow, AnIndexSkeleton, AnStrip } from "./anKit";
import { EARLY_LINE, indexValue, isEarly, pageView, pagesOf, vocabOf } from "./membersModel";
import { useMembersFigures } from "./useMembersFigures";
import { DeltaText, MembersEmptyCard } from "./MembersPage";
import { isoOf, rangeWords } from "../analyticsRange";
import { liveCodes, useMembersData } from "./useMembersData";
import { MembersPage } from "./MembersPage";
import { MemberCodesPage } from "./MemberCodesPage";
import { VenueMembersPage } from "./VenueMembersPage";
import { StoreCustomersIndex, TopCustomersPage } from "./StoreCustomers";
import { appLocale } from "../../../i18n/format";

// Analytics › Members (AN4): the section index (AN4-001), the section pages
// (AN4-005 …, MembersPage), Member codes (OURS-AN4-member-codes with the
// OP1 End pop-up) and the venue roster page (OURS-AN4-member-rosters, the
// one roster component). Routes: /app/business/analytics/members[/<page> |
// /codes | /venue]. Per type: Gym "Members", Classes "Clients", Store
// "Customers" (B11: business_people 'customers' + store orders, StoreCustomers.tsx).

const BASE = "/app/business/analytics/members";

export function MembersSection() {
  const params = useParams();
  const sub = (params["*"] ?? "").replace(/\/+$/, "");
  const { kind, range, setExport } = useAnalytics();
  const navigate = useNavigate();
  const online = useOnline();
  const data = useMembersData();
  const access = useConsoleAccess();
  const vocab = useMemo(() => vocabOf(kind), [kind]);
  // OURS-AN4-classes-variant row 7: no plans and no members (once both are read) → no Plans row, "of 4".
  const hidePlans = kind === "classes" && !data.loading && !data.plansLoading && data.members !== null && data.plans.length === 0 && data.memberTotal === 0;
  const pages = useMemo(() => pagesOf(kind, { hidePlans }), [kind, hidePlans]);
  // B15: each page's boxes and lead from the readers (membersModel pageView).
  const today = isoOf(new Date());
  const fig = useMembersFigures(kind === "store" ? null : data.businessId, range, today);
  const early = isEarly(vocab, fig.figures);
  const views = useMemo(() => {
    const ctx = { planCount: data.plans.length, rangeKey: range.key, rangeWords: rangeWords(range, today), compare: range.compare };
    return new Map(pages.map((p) => [p.key, pageView(p, vocab, fig.figures, ctx)]));
  }, [pages, vocab, fig.figures, data.plans.length, range, today]);

  const waiting = data.codes ? liveCodes(data.codes).length : null;
  const activeAtVenues = data.venues.reduce((s, v) => s + v.activeMembers, 0);
  // B7: list_business_members' total_count is every membership the business
  // has ever had (pending, active, declined, ended), so "none ever" is real now.
  const anyMembers = data.memberTotal > 0 || (data.members?.length ?? 0) > 0 || data.venues.some((v) => v.activeMembers > 0 || v.membershipsAwaitingPayment > 0);
  const known = !data.loading && !data.venuesLoading && (data.members !== null || !data.businessId) && (fig.loaded || !data.businessId);
  // Classes (OURS-AN4-classes-variant rows 15-16): no client ever booked
  // (business_people_summary class_clients) and no member ever.
  const empty = known && !anyMembers && (kind !== "classes" || fig.figures.summary?.class_clients === 0);

  // Export CSV: the index rows as they are ("–" exports as an empty cell, never 0).
  useEffect(() => {
    if (sub) return;
    if (kind === "store" || !known) {
      setExport("", null);
      return;
    }
    setExport(`centium-${vocab.people}.csv`, [
      ["Section", "Value", "Note"],
      ...pages.map((p) => {
        const v = views.get(p.key);
        return [p.title, v?.boxes[0].value ?? null, v?.lead ?? p.coming];
      }),
      ["Member codes waiting", waiting, null],
      ...(data.venues.length > 0 ? [["Active at your venues", activeAtVenues, null]] : []),
    ]);
    return () => setExport("", null);
  }, [sub, kind, known, pages, views, waiting, activeAtVenues, data.venues.length, vocab.people, setExport]);

  if (kind === "store") {
    if (sub === "customers") return <TopCustomersPage businessId={data.businessId} />;
    if (sub) return <Navigate to={BASE} replace />;
    return <StoreCustomersIndex businessId={data.businessId} />;
  }
  if (sub === "codes") return <MemberCodesPage data={data} vocab={vocab} />;
  if (sub === "venue") return <VenueMembersPage vocab={vocab} />;
  if (sub) {
    const page = pages.find((p) => p.key === sub);
    if (!page) return <Navigate to={BASE} replace />;
    return <MembersPage page={page} pages={pages} vocab={vocab} view={views.get(page.key)!} figures={fig.figures} data={data} empty={empty} early={known && early} />;
  }

  const codesLine = waiting === null ? "Create a code for each new member." : waiting > 0 ? `${waiting} waiting to be used` : "Create a code for each new member.";

  return (
    <div>
      {(data.error || fig.error) && <AnStrip offline={!online} text={online ? `Couldn't load your ${vocab.people}. Check your connection and try again.` : `You're offline. Showing ${vocab.people} as of your last visit.`} onRetry={() => { data.reload(); fig.reload(); }} />}

      {empty ? (
        <MembersEmptyCard vocab={vocab}>
          {!!waiting && (
            <button type="button" onClick={() => navigate(`${BASE}/codes`)} className="tap min-h-[44px] text-[12px] leading-[17px] text-charcoal-faint underline-offset-2 hover:underline">
              {waiting === 1 ? "1 code waiting to be used." : `${waiting} codes waiting to be used.`}
            </button>
          )}
        </MembersEmptyCard>
      ) : (
        <>
          {/* AN4-044 rows 10-11: the early hint, the card 12 under it. */}
          {known && early && <AnEarlyHint>{EARLY_LINE}</AnEarlyHint>}
          <AnCard label={`${vocab.label} sections`}>
            {!known ? (
              <AnIndexSkeleton rows={pages.length} />
            ) : (
              pages.map((p, i) => {
                const v = views.get(p.key)!;
                const { value, delta } = indexValue(v);
                return (
                  <AnIndexRow
                    key={p.key}
                    first={i === 0}
                    title={p.title}
                    lead={v.lead}
                    value={value}
                    delta={delta ? <DeltaText d={delta} /> : undefined}
                    onClick={() => navigate(`${BASE}/${p.key}`)}
                    ariaLabel={`${p.title}: ${value ? `${value} ${v.boxes[0].label}` : "no figure yet"}`}
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
            value={waiting === null ? null : waiting.toLocaleString(appLocale())}
            onClick={() => navigate(`${BASE}/codes`)}
            ariaLabel={`Member codes: ${waiting ?? 0} waiting to be used`}
          />
        </AnCard>
      )}

      {/* AN1-026 K1 / V6-28: the Client outcomes screen, also reached from the Overview "More insights" card. The owner's (B7: it adds up the whole business). */}
      {known && !access.isStaff && (
        <AnCard className="mt-[12px]" label="Client outcomes">
          <AnIndexRow
            first
            title="Client outcomes"
            lead="Only from clients who share with you"
            value={null}
            onClick={() => navigate("/app/business/analytics/outcomes")}
            ariaLabel="Client outcomes"
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
            value={activeAtVenues.toLocaleString(appLocale())}
            onClick={() => navigate(`${BASE}/venue`)}
            ariaLabel={`Venue members: ${activeAtVenues} active`}
          />
        </AnCard>
      )}
    </div>
  );
}

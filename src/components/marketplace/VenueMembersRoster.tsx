import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { Button } from "../ui/Button";
import { MemberTag } from "./MemberTag";
import { initials } from "../professionals/typeColour";
import { fetchVenueMembers } from "../../services/venues/console";
import {
  MEMBER_FILTERS,
  MEMBERS_PAGE_SIZE,
  methodLabel,
  money,
  pageLine,
  passStateTag,
  type MembershipStatus,
  type VenueMember,
} from "../../services/venues/consoleLogic";
import { dayMonthYear } from "../../services/venues/venueLogic";

// A venue's member roster (stage A4, venue_members()). Uses the members tab's
// own card rows and the Chip filter rail. NOT YET MATCHED TO THE BUSINESS UI
// BOARD.
//
// A FIRST NAME AND A MINOR FLAG, NOTHING MORE — the contract's line. A venue
// that needs to reach somebody has the venue conversation. Unpaid rows come
// first from the server (they are the ones somebody must act on);
// total_count drives the paging so there is no second call.

export function VenueMembersRoster({ gymId }: { gymId: string }) {
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<{ key: string; members: VenueMember[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${gymId}|${status ?? ""}|${offset}`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueMembers(gymId, status, MEMBERS_PAGE_SIZE, offset);
      if (cancelled) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setPage({ key, ...r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, status, offset, key]);

  const current = page?.key === key ? page : null;
  const members = current?.members ?? [];
  const total = current?.total ?? 0;

  const choose = (s: MembershipStatus | null) => {
    setStatus(s);
    setOffset(0);
  };

  return (
    <div className="mb-6">
      <p className="section-label text-charcoal-faint mb-2.5">Venue members</p>
      <div className="flex gap-2 scroll-row no-scrollbar mb-3 -mx-1 px-1">
        {MEMBER_FILTERS.map((f) => (
          <Chip key={f.label} active={status === f.value} onClick={() => choose(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {error && <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{error}</p>}

      <div className="space-y-2.5">
        {members.map((m) => {
          const tag = passStateTag(m.passState);
          return (
            <Card key={m.membershipId} className="flex items-center gap-3 animate-fade-slide-up">
              <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0 text-sm font-bold text-primary-dark">
                {initials(m.firstName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{m.firstName}</span>
                  {m.isMinor && <MemberTag label="Under 18" tone="muted" />}
                </p>
                <p className="text-xs text-charcoal-faint truncate">
                  {m.planName} · {money(m.priceAgreed)} · {methodLabel(m.paymentMethod)}
                </p>
                <p className="text-xs text-charcoal-faint">
                  {m.expiresOn ? `${dayMonthYear(m.startedOn)} to ${dayMonthYear(m.expiresOn)}` : `From ${dayMonthYear(m.startedOn)}`}
                </p>
              </div>
              <MemberTag label={tag.label} tone={tag.tone} />
            </Card>
          );
        })}

        {current && members.length === 0 && !error && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">
              {status ? `No ${status} memberships at this venue.` : "No memberships at this venue yet."}
            </p>
          </Card>
        )}
        {!current && !error && <p className="text-xs text-charcoal-faint">Loading members…</p>}
      </div>

      {total > MEMBERS_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 mt-3">
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - MEMBERS_PAGE_SIZE))}>
            Previous
          </Button>
          <span className="text-xs text-charcoal-faint tabular-nums">{pageLine(offset, members.length, total)}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + MEMBERS_PAGE_SIZE >= total}
            onClick={() => setOffset((o) => o + MEMBERS_PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

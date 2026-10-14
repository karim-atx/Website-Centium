import { Check, EyeOff, LifeBuoy } from "lucide-react";
import { VenueImage } from "./VenueImage";
import { initials } from "../professionals/typeColour";
import { hostedImageUrl, dayMonthYear } from "../../services/venues/venueLogic";
import type { MyVenue } from "../../services/venues/consoleLogic";
import { VAttentionBand, VBar, VChevron, VGroupHeader, VListCard, VListRow, VPickButton, VPill, DIVIDER } from "./VenueKit";

// The venue console's list / switcher (stage A4, my_venues()), restyled per
// OURS-OP1-venue-switcher (K6 group header, K7 list card and rows, K8 pills,
// K12 hidden notice). Shown only with two or more venues: with one, the
// console head is the whole switcher.
//
// HIDDEN VENUES ARE SHOWN, never dropped: my_venues() returns them last with
// hidden_at set, and an owner whose venue an admin hid must be told why it is
// not on Explore rather than watch it vanish.

/** The head pill for a venue: Hidden wins; null open state shows nothing (never "Closed"). */
export function venuePill(v: Pick<MyVenue, "hiddenAt" | "isOpenNow">): { tone: "good" | "soft" | "high"; label: string } | null {
  if (v.hiddenAt) return { tone: "high", label: "Hidden" };
  if (v.isOpenNow === null) return null;
  return v.isOpenNow ? { tone: "good", label: "Open now" } : { tone: "soft", label: "Closed now" };
}

const countLine = (v: MyVenue) =>
  `${v.activeMembers.toLocaleString()} active member${v.activeMembers === 1 ? "" : "s"} · ${v.upcomingClasses.toLocaleString()} upcoming class${v.upcomingClasses === 1 ? "" : "es"}`;

export function VenueSwitcher({
  venues,
  selected,
  onSelect,
  loading,
}: {
  venues: MyVenue[];
  selected: MyVenue | null;
  onSelect: (gymId: string) => void;
  loading?: boolean;
}) {
  if (loading && venues.length === 0) {
    return (
      <div className="mb-[18px]">
        <VGroupHeader left="Your venues" className="!mt-0" />
        <VListCard>
          {[0, 1].map((i) => (
            <div key={i} className={`flex items-center gap-[12px] min-h-[64px] ${i ? `border-t ${DIVIDER}` : ""}`} style={{ padding: "12px 14px" }}>
              <VBar w={44} h={44} r={12} />
              <span className="space-y-[6px]">
                <VBar w={140} h={12} />
                <VBar w={100} h={10} />
              </span>
            </div>
          ))}
        </VListCard>
      </div>
    );
  }
  if (venues.length < 2) return null;
  return (
    <div className="mb-[18px]">
      <VGroupHeader left="Your venues" right={`${venues.length} venues`} className="!mt-0" />
      <VListCard label="Your venues">
        {venues.map((v, i) => {
          const pill = venuePill(v);
          const active = selected?.gymId === v.gymId;
          return (
            <VListRow
              key={v.gymId}
              first={i === 0}
              onClick={() => {
                onSelect(v.gymId);
                document.getElementById("venue-head")?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
              pressed={active}
              tile={<VenueImage srcs={[hostedImageUrl(v.logoUrl)]} className="absolute inset-0 w-full h-full" fallback={initials(v.name)} />}
              title={v.name}
              pill={pill && <VPill tone={pill.tone} label={pill.label} />}
              line1={v.location || (v.kind === "studio" ? "Studio" : "Gym")}
              line2={countLine(v)}
              trailing={active ? <Check size={16} strokeWidth={2.6} aria-hidden className="text-primary-dark shrink-0" /> : <VChevron />}
            />
          );
        })}
      </VListCard>
    </div>
  );
}

/** K12 · the hidden notice under the head (kept: the owner must be told why). */
export function VenueHiddenNotice({ venue, onContact }: { venue: MyVenue; onContact: () => void }) {
  if (!venue.hiddenAt) return null;
  return (
    <VAttentionBand icon={EyeOff} title={`${venue.name} is hidden from Explore`} className="mt-[14px]">
      <div className="bg-cream-card text-[12px] leading-[17px] text-charcoal-soft" style={{ padding: "10px 16px 14px" }}>
        <p>
          Centium hid this venue on {dayMonthYear(venue.hiddenAt.slice(0, 10))}, so people can't find it on Explore or open its page. You can still see it here.
          Contact Centium support to find out why.
        </p>
        <VPickButton label="Contact support" icon={LifeBuoy} onClick={onContact} className="mt-[10px]" />
      </div>
    </VAttentionBand>
  );
}

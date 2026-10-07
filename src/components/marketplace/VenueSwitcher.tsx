import clsx from "clsx";
import { EyeOff } from "lucide-react";
import { Card } from "../ui/Card";
import { VenueImage } from "./VenueImage";
import { MemberTag } from "./MemberTag";
import { initials } from "../professionals/typeColour";
import { hostedImageUrl, dayMonthYear } from "../../services/venues/venueLogic";
import { openNowTag } from "../../services/venues/hours";
import type { MyVenue } from "../../services/venues/consoleLogic";

// The venue console's list / switcher (stage A4, my_venues()). Built from the
// business console's own cards and tags; NOT YET MATCHED TO THE BUSINESS UI
// BOARD, which was not available when this was written.
//
// HIDDEN VENUES ARE SHOWN, never dropped: my_venues() returns them last with
// hidden_at set, and an owner whose venue an admin hid must be told why it is
// not on Explore rather than watch it vanish.

export function VenueSwitcher({
  venues,
  selected,
  onSelect,
  isOwner,
}: {
  venues: MyVenue[];
  selected: MyVenue | null;
  onSelect: (gymId: string) => void;
  isOwner: boolean;
}) {
  if (venues.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="section-label text-charcoal-faint mb-2.5">{venues.length === 1 ? "Your venue" : "Your venues"}</p>
      <div className="space-y-2.5">
        {venues.map((v) => {
          const open = openNowTag(v.isOpenNow);
          const active = selected?.gymId === v.gymId;
          return (
            <Card
              key={v.gymId}
              interactive={venues.length > 1}
              onClick={venues.length > 1 ? () => onSelect(v.gymId) : undefined}
              aria-pressed={venues.length > 1 ? active : undefined}
              className={clsx("flex items-center gap-3", active && venues.length > 1 && "!border-primary")}
            >
              <span className="relative w-11 h-11 rounded-2xl overflow-hidden bg-primary-pale flex items-center justify-center shrink-0 text-sm font-extrabold text-primary-dark">
                <VenueImage srcs={[hostedImageUrl(v.logoUrl)]} className="absolute inset-0 w-full h-full" fallback={initials(v.name)} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">{v.name}</p>
                <p className="text-xs text-charcoal-faint truncate">{v.location || (v.kind === "studio" ? "Studio" : "Gym")}</p>
              </div>
              {v.hiddenAt ? (
                <MemberTag label="Hidden" tone="muted" />
              ) : (
                open && <MemberTag label={open.label} tone={open.tone} />
              )}
            </Card>
          );
        })}
      </div>

      {selected?.hiddenAt && (
        <Card className="mt-2.5 flex items-start gap-3">
          <EyeOff size={17} className="text-status-high shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal">{selected.name} is hidden from Explore</p>
            <p className="text-xs text-charcoal-soft leading-relaxed mt-0.5">
              Centium hid this venue on {dayMonthYear(selected.hiddenAt.slice(0, 10))}, so people can't find it on Explore or open its
              page. You can still see it here. Contact Centium support to find out why.
            </p>
          </div>
        </Card>
      )}

      {selected && !isOwner && (
        <p className="text-[11px] text-charcoal-faint text-center mt-2.5">
          You're staff at this venue, so you can view it but only the owner can change it.
        </p>
      )}
    </div>
  );
}

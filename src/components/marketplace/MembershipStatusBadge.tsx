import React from "react";
import clsx from "clsx";
import type { MembershipStatus } from "../../services/business-members";

// One badge for the four membership states, used on both sides.
//
// COLOURS BORROWED, NOT INVENTED. These are the same three treatments the
// calendar invitations already use for the same three ideas — gold for an
// unanswered invitation, primary-pale for a yes, cream-soft/faint for a no —
// so somebody who has seen one screen can read the other. "Ended" takes the
// same muted treatment as declined because both mean "not in effect", and the
// word carries the difference.

const style: Record<MembershipStatus, string> = {
  pending: "bg-gold/15 text-gold",
  active: "bg-primary-pale text-primary-dark",
  declined: "bg-cream-soft text-charcoal-faint",
  ended: "bg-cream-soft text-charcoal-faint",
};

const label: Record<MembershipStatus, string> = {
  pending: "Invited",
  active: "Member",
  declined: "Declined",
  ended: "Ended",
};

export const MembershipStatusBadge: React.FC<{ status: MembershipStatus; className?: string }> = ({
  status,
  className,
}) => (
  <span
    className={clsx(
      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
      style[status],
      className
    )}
  >
    {label[status]}
  </span>
);

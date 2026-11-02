import type { BizKind } from "../../../components/business-more/kind";
import type { BusinessRole } from "./teamData";
import { Activity, ClipboardList, Dumbbell, ShoppingBag, UserCog, UserRoundCheck, type LucideIcon } from "lucide-react";
import { t, tk } from "../../../i18n/core";

// Per-type words (AN5-001 O11, AN5-005 O3, AN5-065 O5; HANDOVER §3
// vocabulary: Store uses "staff", Classes clients, Gym members). The nouns
// stay English (screens pick a whole sentence per kind for Arabic); the
// labels are catalogue keys shown through t().

export interface Vocab {
  kind: BizKind;
  singular: string;
  /** "an instructor" / "a staff member" */
  aSingular: string;
  plural: string;
  activeLabel: string;
  teamWord: string;
  emptyTitle: string;
  emptyBody: string;
  payers: string;
}

export function vocabFor(kind: BizKind): Vocab {
  if (kind === "store")
    return {
      kind,
      singular: "staff member",
      aSingular: "a staff member",
      plural: "staff",
      activeLabel: tk("Active staff"),
      teamWord: "team",
      emptyTitle: tk("No staff yet"),
      emptyBody: tk("Add the people who help run your store."),
      payers: "customers",
    };
  return {
    kind,
    singular: "instructor",
    aSingular: "an instructor",
    plural: "instructors",
    activeLabel: tk("Active instructors"),
    teamWord: "team",
    emptyTitle: tk("No instructors yet"),
    emptyBody: tk("Add the professionals who run your classes. Their fill rates, repeat bookings and teaching load appear here once they teach."),
    payers: kind === "classes" ? "clients" : "members",
  };
}

// Roles (AN5-013 row 5): the B6 business_role enum. Physiotherapist and
// Nutritionist are drawn but have no enum value (BACKEND), so they are not
// offered; Manager comes from the OP1 role table (V6-161); Store gets Shop
// assistant.
export const ROLE_LABEL: Record<BusinessRole, string> = {
  instructor: tk("Instructor"),
  trainer: tk("Personal trainer"),
  front_desk: tk("Front desk"),
  manager: tk("Manager"),
  staff: tk("Staff"),
  shop_assistant: tk("Shop assistant"),
};

export const ROLE_ICON: Record<BusinessRole, LucideIcon> = {
  instructor: Dumbbell,
  trainer: UserRoundCheck,
  front_desk: ClipboardList,
  manager: UserCog,
  staff: Activity,
  shop_assistant: ShoppingBag,
};

/** A role's name in the app's language (ROLE_LABEL holds the English). */
export const roleLabel = (r: BusinessRole): string => t(ROLE_LABEL[r] ?? "Staff");

export function rolesFor(kind: BizKind): BusinessRole[] {
  return kind === "store" ? ["shop_assistant", "front_desk", "manager"] : ["instructor", "trainer", "front_desk", "manager"];
}

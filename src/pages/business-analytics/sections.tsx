import type React from "react";
import type { BizKind } from "../../components/business-more/kind";
import type { ConsoleNeed } from "../../services/business-console";
import { MembersSection } from "./members/MembersSection";
import ClassesSection from "./classes/ClassesSection";
import TeamSection from "./team/TeamSection";
import { OverviewSection } from "./overview/OverviewSection";
import { ClientOutcomesPage } from "./overview/ClientOutcomesPage";
import ReputationPage from "./reputation/ReputationPage";
import ProductsSection from "./products/ProductsSection";
import RevenuePage from "./revenue/RevenuePage";
import { t, tk } from "../../i18n/core";

// The Analytics sections per type (AN5-001 row 5, AN4-045 row 5a, COPY.md
// l.481): Gym Overview · Classes · Members · Team; Classes Overview · Classes
// · Clients · Instructors; Store Overview · Customers · Products. The people
// section's key is "members" for every type (its label changes).
//
// ONE LINE PER SECTION: each build registers its view here. Products keeps
// AN11 Products is registered (ProductsSection).
//
// PUSHED SCREENS (V6-28): Client outcomes is not a fifth tab any more (the
// four tabs are already full at 360); it is its own screen at
// /app/business/analytics/outcomes, opened from the full-width "More
// insights" card on Overview and from the Members people block. A pushed
// screen gets the BizTypeKit back header, the range tabs and the range line
// from the shell. Reputation (AN13) is a FULL_PAGE section (its own chrome).
// The Overview insight cards open /app/business/analytics/reputation and
// /revenue once either list holds that key (until then the card shows
// without a chevron).

export type SectionKey = "overview" | "classes" | "members" | "team" | "products" | "reputation" | "revenue";

/**
 * Sections that draw their own page (own Back and range tabs, not the shell
 * chrome) and are not tabs: AN13 Reputation. (Restored by the AN1 agent
 * after an overlapping edit of this file; AN13 owns this entry.) AN14
 * Revenue (Batch 5 Revenue agent) is the second.
 */
export const FULL_PAGE_SECTIONS: SectionKey[] = ["reputation", "revenue"];

export function sectionTabs(kind: BizKind): { key: SectionKey; label: string }[] {
  if (kind === "store")
    return [
      { key: "overview", label: t("Overview") },
      { key: "members", label: t("Customers") },
      { key: "products", label: t("Products") },
    ];
  return [
    { key: "overview", label: t("Overview") },
    { key: "classes", label: t("Classes") },
    { key: "members", label: kind === "classes" ? t("Clients") : t("Members") },
    { key: "team", label: kind === "classes" ? t("Instructors") : t("Team") },
  ];
}

export const SECTION_VIEWS: Record<SectionKey, React.FC> = {
  overview: OverviewSection,
  classes: ClassesSection,
  members: MembersSection,
  team: TeamSection,
  products: ProductsSection, // AN11 (Batch 5)
  reputation: ReputationPage,
  revenue: RevenuePage,
};

export interface PushedView {
  View: React.FC;
  title: string;
  sub: string;
  /** Types that have this screen (default: every type). */
  kinds?: BizKind[];
  /** Whether the shell offers Export CSV here (default false). */
  exportable?: boolean;
}

export const PUSHED_VIEWS: Record<string, PushedView> = {
  outcomes: { View: ClientOutcomesPage, title: tk("Client outcomes"), sub: tk("Only from clients who share with you"), kinds: ["classes", "gym"] },
};

/**
 * B7: what each section needs from a staff member (the owner sees all).
 * Overview and Client outcomes add up the whole business, so they stay the
 * owner's; the rest follow the permission their readers ask business_can for.
 */
export const SECTION_NEED: Record<string, ConsoleNeed> = {
  overview: "owner",
  outcomes: "owner",
  classes: "schedule",
  members: "members",
  team: "members",
  products: "store",
  reputation: "marketing",
  revenue: "revenue",
};

export const pushedFor = (kind: BizKind): string[] => Object.keys(PUSHED_VIEWS).filter((k) => !PUSHED_VIEWS[k].kinds || PUSHED_VIEWS[k].kinds.includes(kind));

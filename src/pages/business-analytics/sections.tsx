import type React from "react";
import type { BizKind } from "../../components/business-more/kind";
import BusinessAnalyticsTab from "../marketplace/BusinessAnalyticsTab";
import { MembersSection } from "./members/MembersSection";
import ClassesSection from "./classes/ClassesSection";
import TeamSection from "./team/TeamSection";
import { OutcomesSection } from "./OutcomesSection";

// The Analytics sections per type (AN5-001 row 5, AN4-045 row 5a, COPY.md
// l.481): Gym Overview · Classes · Members · Team; Classes Overview · Classes
// · Clients · Instructors; Store Overview · Customers · Products. Client
// Outcomes stays as a fifth tab for Classes and Gym, with its honest empty
// state (AN4-001 K1 / AN5-001 K1; hidden for Store). The people
// section's key is "members" for every type (its label changes).
//
// ONE LINE PER SECTION: the Classes (AN3) and Team (AN5) builds register
// their views here. Until a section has its own view, the earlier Analytics
// body renders for it (embedded, without its own header).

export type SectionKey = "overview" | "classes" | "members" | "team" | "products" | "outcomes";

export function sectionTabs(kind: BizKind): { key: SectionKey; label: string }[] {
  if (kind === "store")
    return [
      { key: "overview", label: "Overview" },
      { key: "members", label: "Customers" },
      { key: "products", label: "Products" },
    ];
  return [
    { key: "overview", label: "Overview" },
    { key: "classes", label: "Classes" },
    { key: "members", label: kind === "classes" ? "Clients" : "Members" },
    { key: "team", label: kind === "classes" ? "Instructors" : "Team" },
    { key: "outcomes", label: "Outcomes" },
  ];
}

const Legacy: React.FC = () => <BusinessAnalyticsTab embedded view="insights" />;

export const SECTION_VIEWS: Record<SectionKey, React.FC> = {
  overview: Legacy,
  classes: ClassesSection,
  members: MembersSection,
  team: TeamSection,
  products: Legacy,
  outcomes: OutcomesSection,
};

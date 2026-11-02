import React from "react";
import { PageHeader } from "../ui/PageHeader";
import { FixedHeader } from "../ui/FixedHeader";
import { useBack } from "../../hooks/useBack";
import { t, tk } from "../../i18n/core";

export type MindSection = "habits" | "journal" | "achievements" | "meditation";

// The sub-page header, for each section (MO1.1.1 #3-#4, MO1.1.2 #4-#5,
// MO1.1.3, MO1.1.4).
const MIND_SECTION_TITLE: Record<MindSection, string> = {
  habits: tk("Habits"),
  journal: tk("Journal"),
  achievements: tk("Achievements"),
  meditation: tk("Meditation"),
};
const MIND_SECTION_SUBTITLE: Record<MindSection, string> = {
  habits: tk("Track your daily habits"),
  journal: tk("Your thoughts, logged"),
  achievements: tk("What you've earned so far"),
  meditation: tk("Breathing, stretching & yoga"),
};

/**
 * The Mind sub-page header (PB4 §8 1b). Each Mind section owns its header so
 * Journal, Achievements and Meditation can hold it, with their tab row, in the
 * shared fixed area (MO1.1.2 #1, MO1.1.3, MO1.1.4: "the header and the tab row
 * are fixed on scroll"). Habits has no fixed area (the handover scopes the
 * rule to MO1.1.2, MO1.1.3, MO1.1.4 and their children), so `fixed={false}`
 * renders the plain header that scrolls with the page.
 *
 * `children` (the tab row) sits under the header inside the fixed area; the
 * header's own 20 bottom gap is the frames' header-to-track gap.
 */
export const MindHeader: React.FC<{
  section: MindSection;
  fixed?: boolean;
  children?: React.ReactNode;
  /** Bottom padding of the fixed area (default 16, MO1.1.2 #1). */
  paddingBottom?: number;
  /** Space between the header and the tab row (default 20; MO1.1.4 draws 16). */
  headerGap?: number;
}> = ({ section, fixed = true, children, paddingBottom, headerGap }) => {
  const back = useBack();
  const header = (
    <PageHeader
      title={t(MIND_SECTION_TITLE[section])}
      subtitle={t(MIND_SECTION_SUBTITLE[section])}
      showBack
      onBack={back}
      bottomGap={fixed && !children ? 0 : headerGap}
    />
  );
  if (!fixed) return header;
  return (
    <FixedHeader paddingBottom={paddingBottom}>
      {header}
      {children}
    </FixedHeader>
  );
};

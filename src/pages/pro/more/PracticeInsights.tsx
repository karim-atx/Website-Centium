import { ProComingSoonPage } from "../ProComingSoonPage";

/**
 * Release 3 · Practice insights (/app/more/practice-insights, MO19), which
 * replaces the old Health metrics row. Owned by W6, which replaces this file
 * (practice_insights()). W5 removed the Health metrics page that used to be
 * mounted here: its per-client data lives on the client page (W3) and its
 * notes were imported into private Notes (J4); none of it was practice-level.
 */
export default function PracticeInsights() {
  return <ProComingSoonPage title="Practice insights" showBack />;
}

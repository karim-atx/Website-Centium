import { useNavigate } from "react-router-dom";
import { ClipboardList, FileText, Send, UtensilsCrossed } from "lucide-react";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useBack } from "../../../hooks/useBack";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ListCard, type ListRow } from "../../../components/pro/client/kit";
import { ComingSoonPill } from "../../../components/pro/ComingSoon";
import { PRO_ROUTES } from "../../../components/pro/subtypeLanes";

/**
 * Release 3 · MO10 Templates (/app/more/templates; gen/board.js templates):
 * pageHead "Templates" / "Reuse what works". The frame's Programmes and Meal
 * plans tabs are the same lists as Library › Programmes and Meal plans (W5),
 * and Notes is MO21 Note templates, so this page links to them instead of
 * drawing a second copy (FINAL_PLAN: one place per feature):
 * - Full coaching: Programmes, Meal plans (Library), Notes;
 * - Nutrition: Meal plans (the Meal plans tab), Notes;
 * - Clinical overview: Notes, and Referral letters (no table: Coming soon).
 */
export default function Templates() {
  const navigate = useNavigate();
  const { lane } = useProSubtype();
  const back = useBack(PRO_ROUTES.more);
  const notes: ListRow = { key: "notes", icon: FileText, title: "Notes", meta: "Note templates", onClick: () => navigate(`${PRO_ROUTES.more}/note-templates`) };
  const rows: ListRow[] =
    lane === "clinical_overview"
      ? [notes, { key: "referral", icon: Send, title: "Referral letters", meta: "Letters to colleagues", trailing: <ComingSoonPill /> }]
      : lane === "nutrition"
        ? [{ key: "meal", icon: UtensilsCrossed, title: "Meal plans", meta: "In Meal plans", onClick: () => navigate(PRO_ROUTES.mealPlans) }, notes]
        : [
            { key: "prog", icon: ClipboardList, title: "Programmes", meta: "In your Library", onClick: () => navigate(`${PRO_ROUTES.library}/programmes`) },
            { key: "meal", icon: UtensilsCrossed, title: "Meal plans", meta: "In your Library", onClick: () => navigate(`${PRO_ROUTES.library}/meal-plans`) },
            notes,
          ];
  return (
    <div>
      <PageHeader title="Templates" subtitle="Reuse what works" showBack onBack={back} />
      {lane && <ListCard rows={rows} />}
    </div>
  );
}

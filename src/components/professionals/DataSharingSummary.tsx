import React, { useCallback, useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import { ConnectedProfessionalDetail } from "./ConnectedProfessionalDetail";
import { DataSharingSection } from "./DataSharingSection";
import {
  ACCESS_CATEGORIES,
  fetchLinkedProfessionals,
  fetchMyGrants,
  type GrantMap,
  type LinkedProfessional,
  type UnansweredMap,
} from "../../services/consent";

/**
 * A one-line-per-professional summary of the client's sharing settings, with
 * the actual toggles behind a sheet.
 *
 * WHY THIS EXISTS. The Professionals page rendered the full DataSharingSection
 * inline, above the roster and the browse directory. That was survivable at
 * five categories and stopped being so at seven: the block grew 93px, which
 * pushed the first roster card from y=562 to y=655 in a 698px viewport and
 * left the entire first screen showing nothing but consent toggles. Users
 * reported it as the tab navigating to the wrong page. Nothing navigated —
 * there was simply nothing else above the fold.
 *
 * Collapsing it fixes that for good rather than for now. An inline block grows
 * every time a category is added, so the next split would reintroduce the same
 * bug; a summary row is a fixed height whatever ACCESS_CATEGORIES holds.
 *
 * The sheet renders DataSharingSection narrowed to one professional — the same
 * component, the same reads and writes, the same rows — matching what the
 * Profile tab already does. Consent behaviour is not reimplemented here, and
 * this component deliberately holds no toggle logic of its own.
 */
export const DataSharingSummary: React.FC = () => {
  const { authUserId } = useApp();
  const [professionals, setProfessionals] = useState<LinkedProfessional[]>([]);
  const [grants, setGrants] = useState<Record<string, GrantMap>>({});
  const [unanswered, setUnanswered] = useState<UnansweredMap>({});
  const [loading, setLoading] = useState(true);
  const [openFor, setOpenFor] = useState<LinkedProfessional | null>(null);

  const load = useCallback(async () => {
    if (!authUserId) {
      setLoading(false);
      return;
    }
    const [linked, myGrants] = await Promise.all([
      fetchLinkedProfessionals(),
      fetchMyGrants(authUserId),
    ]);
    if (linked.status === "ok") setProfessionals(linked.professionals);
    if (myGrants.status === "ok") {
      setGrants(myGrants.grants);
      setUnanswered(myGrants.unanswered);
    }
    setLoading(false);
  }, [authUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Errors are deliberately not surfaced here. This is a summary of controls,
  // not the controls: the sheet re-fetches on open and reports its own
  // failures next to the toggles they belong to, which is where a client can
  // act on them.
  if (!authUserId || loading) return null;
  if (professionals.length === 0) return null;

  const total = ACCESS_CATEGORIES.length;

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <ShieldCheck size={13} /> Data sharing
      </p>

      {professionals.map((pro) => {
        const granted = ACCESS_CATEGORIES.filter(
          (c) => grants[pro.professionalId]?.[c.category] === true
        ).length;
        const pending = unanswered[pro.professionalId]?.length ?? 0;
        return (
          <Card
            key={pro.professionalId}
            interactive
            onClick={() => setOpenFor(pro)}
            className="mb-2.5 animate-fade-slide-up"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
                {pro.avatarUrl ? (
                  <img src={pro.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <PERSON_ICON size={17} className="text-primary-dark" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal truncate">{pro.name}</p>
                {/* A count alone would report an unanswered category as a
                    settled "no", which is the confusion this whole piece of
                    work exists to undo. Pending is called out separately. */}
                <p className="text-xs text-charcoal-faint truncate">
                  {granted} of {total} shared
                  {pending > 0 && (
                    <span className="text-primary-dark font-semibold">
                      {" · "}
                      {pending} need{pending === 1 ? "s" : ""} your answer
                    </span>
                  )}
                </p>
              </div>
              <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
            </div>
          </Card>
        );
      })}

      {/* Re-reads on close so the summary reflects whatever was changed in the
          sheet, including a decline — which changes no toggle position and
          would otherwise leave the pending count stale. */}
      <BottomSheet
        open={!!openFor}
        onClose={() => {
          setOpenFor(null);
          void load();
        }}
        title={openFor?.name ?? "Data sharing"}
      >
        {/* Above the controls, because it is context for the decision being
            made below it rather than a separate destination. Renders nothing
            at all when the professional has written no bio, which is the
            common case today. */}
        {openFor && <ConnectedProfessionalDetail professionalId={openFor.professionalId} />}
        {openFor && <DataSharingSection professionalId={openFor.professionalId} />}
      </BottomSheet>
    </div>
  );
};

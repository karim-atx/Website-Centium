import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchMyGrants } from "../../services/consent";

const SHARING_ROUTE = "/app/professionals";

/**
 * Tells a client, app-wide, that a sharing category they once agreed to has
 * been split into narrower ones they have never actually been asked about.
 *
 * WHY THIS IS NOT ONLY IN THE SETTINGS SCREEN. The whole failure being
 * corrected is that a client agreed to something broader than the label
 * suggested. Leaving the correction to be discovered by whoever happens to
 * open their sharing settings would repeat the same mistake — the person who
 * needs to know is exactly the person not looking. So the prompt comes to
 * them, and the answering happens in DataSharingSection, which this links to.
 *
 * IT CANNOT BE DISMISSED. It clears itself when the client answers, which
 * keeps it out of localStorage (which would re-nag on a second device) and
 * out of the database (which would need a column for a flag the consent rows
 * already imply).
 *
 * INCOMPLETE, KNOWINGLY: only "yes" currently clears it. Declining writes
 * false onto a row that is already false, and stamp_client_access_grant()
 * only stamps when `new.granted is distinct from old.granted` — so a decline
 * leaves both timestamps null and the category still reads as unanswered.
 * Until that trigger records a decline, this banner is a one-directional
 * prompt, which is the wrong shape for a consent control. See the README
 * follow-up; the fix belongs in the Database repo, not here.
 */
export const ConsentReviewBanner: React.FC = () => {
  const { authUserId, user } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  // Professionals and businesses have no grants of their own to review; this
  // is a client-side control. Re-runs on navigation so answering on the
  // sharing screen clears the banner without a reload.
  useEffect(() => {
    if (!authUserId || user.accountType !== "customer") {
      setCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await fetchMyGrants(authUserId);
      if (cancelled) return;
      if (result.status !== "ok") return;
      setCount(Object.values(result.unanswered).reduce((n, cats) => n + cats.length, 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, user.accountType, pathname]);

  // Suppressed on the screen that answers it — the in-card notice there says
  // the same thing with the professional's name, next to the actual toggles.
  if (count === 0 || pathname === SHARING_ROUTE) return null;

  // Iteration 6 "Team" §5 More: "restyled with lavender ground" — the
  // gradient below is the same one used for the Home streak board and
  // Health's weight-trend hero, since the manifest shows the identical
  // treatment here. Content and behaviour (clears itself, links to the
  // same sharing screen) are unchanged.
  return (
    <div
      className="relative overflow-hidden rounded-[22px] px-4 py-4 mb-[13px]"
      style={{ background: "var(--gradient-lavender-accent)" }}
    >
      <div className="flex items-start gap-[11px]">
        <ShieldCheck size={17} className="text-white shrink-0 mt-px" />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold tracking-[-0.01em] text-white">
            A sharing question we didn't ask precisely enough
          </p>
          <p className="mt-[5px] text-[11px] leading-[1.6] text-white/[0.82]">
            Your health sharing settings used to bundle several different things into one
            switch. We've separated them so you can decide each one. Nothing you already chose
            has changed — there are just two new questions waiting for you.
          </p>
          <button
            onClick={() => navigate(SHARING_ROUTE)}
            className="tap mt-[11px] rounded-full bg-white text-[11px] font-extrabold px-[15px] py-2"
            style={{ color: "#5F5093" }}
          >
            Review sharing
          </button>
        </div>
      </div>
    </div>
  );
};

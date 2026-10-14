import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { fetchGoLiveStatus, fetchOwnerProgress, markOwnerItemDismissed } from "../../services/professional-onboarding";
import { fetchMyCv, type Licence } from "../../services/professional-cv";
import { fetchProLaneColumns } from "../../services/professional-onboarding";
import { NEEDS_VERIFICATION, setPublicListing } from "../../services/professional-profile";
import { ProStatusScreen, type ProStatus } from "../onboarding/pro/ProStatusScreen";
import { ProLicencePublish } from "../onboarding/pro/ProLicencePublish";
import { GO_LIVE_ON_VERIFICATION, PRO_LABEL, initials, isRegulated, proKindOf } from "../onboarding/pro/proModel";

/**
 * A professional's licence or certificate check after onboarding (OB-184
 * pending, OB-186 / OB-188 verified, OB-189 couldn't verify; Fitness / Other:
 * OB-155 / OB-212 You're live once the certificate is verified), read from
 * the existing licence review queue. Reached from Get set up's licence row.
 * Every lane is listed on Explore here (or on the dashboard) once verified
 * (user decision 14 Oct 2026). One free-text reviewer reason exists today;
 * the per-item reasons the frame draws are a B5 open item (BACKEND).
 */
export default function ProVerification() {
  const { authUserId, user } = useApp();
  const navigate = useNavigate();
  const kind = proKindOf(user.professionalSubtype);
  const regulated = isRegulated(kind);
  const [state, setState] = useState<{
    status: ProStatus | "loading" | "error";
    reason?: string | null;
    at?: Date | null;
    tags: string[];
    line: string | null;
    noDocument?: boolean;
    notListed?: string | null;
  }>({
    status: "loading",
    tags: [],
    line: null,
  });
  // OURS-licence-publish: verified is not public. The licences stay hidden
  // until the person switches them on here or in My CV (20261120150000).
  const [licences, setLicences] = useState<Licence[]>([]);

  const load = useCallback(async () => {
    if (!authUserId) return;
    setState((s) => ({ ...s, status: "loading" }));
    const [st, lane, cv, progress] = await Promise.all([
      fetchGoLiveStatus(authUserId, regulated),
      fetchProLaneColumns(authUserId),
      fetchMyCv(authUserId),
      fetchOwnerProgress(authUserId),
    ]);
    if (!st.ok) {
      setState((s) => ({ ...s, status: "error" }));
      return;
    }
    const kindOf = st.status.kind;
    const verified = kindOf === "verified";
    const status: ProStatus = verified ? (regulated ? "verified" : "live") : kindOf === "rejected" ? "rejected" : "pending";
    let notListed: string | null = null;
    let listedNow = lane.ok && !!lane.row?.listed_publicly;
    const pendingLive = progress.ok ? progress.items[GO_LIVE_ON_VERIFICATION] : undefined;
    if (verified && pendingLive && !pendingLive.dismissed) {
      const r = await setPublicListing(true);
      if (r.status === "ok") listedNow = r.listed;
      else if (r.status === "error") notListed = r.message;
      else if (r.status === "affiliated") notListed = "Your listing is handled by your business while you're affiliated.";
      else if (r.status === "needs_verification") notListed = NEEDS_VERIFICATION;
      // ATXC6: the database doesn't count the check yet, so keep the item and list on a later visit.
      if (r.status !== "needs_verification") await markOwnerItemDismissed(authUserId, GO_LIVE_ON_VERIFICATION);
    }
    // Verified but switched off (or never switched on): don't claim clients can find them.
    if (verified && !notListed && lane.ok && !listedNow) notListed = "You're not on Explore right now. Turn it on in Choose who can find you.";
    setLicences(cv.ok ? cv.cv.licences : []);
    setState({
      status,
      reason: st.status.kind === "rejected" ? st.status.reason : null,
      at: null,
      tags: lane.ok ? lane.row?.specialties ?? [] : [],
      line: cv.ok ? cv.cv.profile.headline : null,
      noDocument: kindOf === "none",
      notListed,
    });
  }, [authUserId, regulated]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const name = user.firstName ?? "";
  return (
    <ProStatusScreen
      status={state.status}
      kind={kind}
      firstName={name}
      submittedAt={state.at}
      rejectionReason={state.reason}
      noDocument={state.noDocument}
      notListed={state.notListed}
      preview={{ initials: initials(name), avatarUrl: user.avatarUrl ?? null, name, label: PRO_LABEL[kind], tags: state.tags, line: state.line }}
      onPrimary={() => navigate("/app/professionals")}
      onFix={() => navigate("/app/profile/cv")}
      onRetry={() => void load()}
      extra={
        <ProLicencePublish
          licences={licences}
          onChanged={(l) => setLicences((ls) => ls.map((x) => (x.id === l.id ? l : x)))}
          unnamedHint="Add its name in My CV to show it on your profile."
          margin="18px 2px 4px"
        />
      }
    />
  );
}

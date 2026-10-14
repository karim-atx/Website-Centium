import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { fetchCredentialRows, fetchLicenceStatus, fetchOwnerProgress, markOwnerItemDismissed } from "../../services/professional-onboarding";
import { fetchMyCv, type Licence } from "../../services/professional-cv";
import { fetchProLaneColumns } from "../../services/professional-onboarding";
import { setPublicListing } from "../../services/professional-profile";
import { ProStatusScreen, type ProStatus } from "../onboarding/pro/ProStatusScreen";
import { ProLicencePublish } from "../onboarding/pro/ProLicencePublish";
import { GO_LIVE_ON_VERIFICATION, PRO_LABEL, initials, proKindOf } from "../onboarding/pro/proModel";

/**
 * A Physiotherapist's or Dietitian's licence check after onboarding
 * (OB-184 pending, OB-186 / OB-188 verified, OB-189 couldn't verify), read
 * from the existing licence review queue. Reached from Get set up's licence
 * row. One free-text reviewer reason exists today; the per-item reasons the
 * frame draws are a B5 open item (BACKEND).
 */
export default function ProVerification() {
  const { authUserId, user } = useApp();
  const navigate = useNavigate();
  const kind = proKindOf(user.professionalSubtype);
  const [state, setState] = useState<{ status: ProStatus | "loading" | "error"; reason?: string | null; at?: Date | null; tags: string[]; line: string | null }>({
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
    const [rows, lane, cv, progress] = await Promise.all([
      fetchCredentialRows(authUserId),
      fetchProLaneColumns(authUserId),
      fetchMyCv(authUserId),
      fetchOwnerProgress(authUserId),
    ]);
    if (!rows.ok || !rows.registration) {
      setState((s) => ({ ...s, status: rows.ok ? "pending" : "error" }));
      return;
    }
    const st = await fetchLicenceStatus(authUserId, rows.registration);
    if (!st.ok) {
      setState((s) => ({ ...s, status: "error" }));
      return;
    }
    const status: ProStatus = st.status.kind === "verified" ? "verified" : st.status.kind === "rejected" ? "rejected" : "pending";
    const pendingLive = progress.ok ? progress.items[GO_LIVE_ON_VERIFICATION] : undefined;
    if (status === "verified" && pendingLive && !pendingLive.dismissed) {
      await setPublicListing(true);
      await markOwnerItemDismissed(authUserId, GO_LIVE_ON_VERIFICATION);
    }
    setLicences(cv.ok ? cv.cv.licences : []);
    setState({
      status,
      reason: st.status.kind === "rejected" ? st.status.reason : null,
      at: null,
      tags: lane.ok ? lane.row?.specialties ?? [] : [],
      line: cv.ok ? cv.cv.profile.headline : null,
    });
  }, [authUserId]);

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

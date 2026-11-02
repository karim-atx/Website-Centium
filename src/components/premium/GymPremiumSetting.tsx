import { useEffect, useState } from "react";
import { BizCard, BizLabel, BizNote, BizRow } from "../business-more/kit";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { useSwitches } from "../../services/premium/hooks";
import { fetchGymPasses, premiumOn, setGymPremium, type GymPasses } from "../../services/premium";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · EA for gyms: "Include Premium for members" in the business's
// Settings (set_business_premium_for_members, business_premium_passes: cap
// 25 + 25 per seat block, 0 without an active plan; the passes are given by
// the Database's daily run). Owner only, and only while the Premium switch
// is on for them; nothing at all otherwise.
export function GymPremiumSetting() {
  const access = useConsoleAccess();
  const { switches } = useSwitches();
  const businessId = access.isOwner ? access.businessId : null;
  const on = premiumOn(switches);
  const [state, setState] = useState<{ id: string; v: GymPasses } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!on || !businessId) return;
    let live = true;
    void fetchGymPasses(businessId).then((r) => live && r.ok && setState({ id: businessId, v: r.value }));
    return () => {
      live = false;
    };
  }, [on, businessId]);

  const v = state && state.id === businessId ? state.v : null;
  if (!on || !businessId || !v) return null;

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await setGymPremium(businessId, next);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    const fresh = await fetchGymPasses(businessId);
    setState({ id: businessId, v: fresh.ok ? fresh.value : { ...v, premiumForMembers: r.value } });
  };

  return (
    <>
      <BizLabel>{t("Centium Premium")}</BizLabel>
      <BizCard>
        <BizRow
          title={t("Include Premium for members")}
          desc={v.cap > 0 ? tn(v.cap, "{used} of {n} member has Premium through you", "{used} of {n} members have Premium through you", { used: v.used }) : t("Comes with an active business plan")}
          toggle={{ checked: v.premiumForMembers, disabled: busy || (v.cap === 0 && !v.premiumForMembers), onChange: (next) => void toggle(next), label: t("Include Premium for members") }}
        />
      </BizCard>
      <BizNote>
        {error ? t(error) : v.premiumForMembers ? t("Members with an active membership get Premium, up to your plan's limit. Turning this off ends theirs 7 days later, and they're told.") : t("Your members with an active membership get Centium Premium, up to your plan's limit.")}
      </BizNote>
    </>
  );
}

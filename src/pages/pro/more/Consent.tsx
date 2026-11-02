import { useCallback, useEffect, useState } from "react";
import { Download, Dumbbell, FileLock, HeartPulse, Moon, Scale, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { SubPage } from "../../../components/pro/profile/kit";
import { SettingsRow, SettingsSection } from "../../../components/ui/SettingsRows";
import { Toast } from "../../../components/ui/Toast";
import { INK } from "../../../components/pro/proInk";
import { ComingSoonPill } from "../../../components/pro/ComingSoon";
import { ListSkeleton, OfflineLine, ProError } from "../../../components/pro/states";
import { CONSENT_SWITCHES, switchOn, withSwitch, type ConsentSwitch } from "./consentModel";
import { fetchPracticeSettings, saveDataRequests, type AccessCategory } from "../../../services/pro/practice";
import { t } from "../../../i18n/core";

const ICONS = { workouts: Dumbbell, food: UtensilsCrossed, body: Scale, vitals: HeartPulse } as const;

/**
 * Release 3 · MO11 Consent and data sharing (/app/more/consent; gen/more.js
 * consent): the teal-pale note (r16, pad 14, gap 10, shield 18 #3C6B65 /
 * dark #B2D4CF, 12.5 text.soft 1.55), then sSection / sRows (SettingsSection
 * and SettingsRow) as drawn.
 *
 * "What you ask new clients to share" is practice_settings.default_data_requests
 * (asked of every new client when they hire you; the same list as Settings ›
 * Practice › Default data requests). Each switch maps to access categories in
 * consentModel.ts; categories this page doesn't draw (medical history,
 * allergies, habits...) are kept on every save. Sleep has no access category
 * of its own: sleep is shared with Activity & vitals (health_metrics), so the
 * row says it's asked with Vitals and lab results and its own switch is
 * Coming soon (backend gap).
 *
 * "Your responsibilities": there is no professional terms page and no
 * client-record export (backend gaps), so both rows are Coming soon.
 */
export default function Consent() {
  const { authUserId: me } = useApp();
  const dark = useIsDark();
  const [cats, setCats] = useState<AccessCategory[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    setState("loading");
    const r = await fetchPracticeSettings(me);
    if (r.ok) {
      setCats(r.data.dataRequests);
      setState("ok");
    } else setState(r.offline ? "offline" : "error");
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);

  const flip = async (key: ConsentSwitch, on: boolean) => {
    if (!me || !cats) return;
    const prev = cats;
    const next = withSwitch(cats, key, on);
    setCats(next);
    const r = await saveDataRequests(me, next);
    if (!r.ok) {
      setCats(prev);
      setToast(r.message);
    }
  };

  return (
    <SubPage title={t("Consent and data sharing")} bottomPad={120}>
      <div className="flex" style={{ borderRadius: 16, background: INK.tealPale, padding: 14, gap: 10, marginBottom: 8 }}>
        <ShieldCheck size={18} strokeWidth={2} aria-hidden style={{ color: dark ? "#B2D4CF" : "#3C6B65", flexShrink: 0 }} />
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.55 }}>{t("Clients choose what to share with you, item by item, and can stop at any time. You only ever see what they have shared.")}</p>
      </div>
      <SettingsSection label={t("What you ask new clients to share")} className="mt-6">
        {state === "offline" && cats && <OfflineLine />}
        {!cats ? (
          state === "loading" ? (
            <ListSkeleton rows={5} />
          ) : state === "offline" ? (
            <OfflineLine />
          ) : (
            <ProError onRetry={() => void load()} />
          )
        ) : (
          <>
            {CONSENT_SWITCHES.slice(0, 3).map((s) => (
              <SettingsRow key={s.key} icon={ICONS[s.key]} title={t(s.title)} subtitle={s.sub ? t(s.sub) : undefined} toggle={{ checked: switchOn(cats, s.key), onChange: (v) => void flip(s.key, v), label: t(s.title) }} />
            ))}
            <SettingsRow icon={Moon} title={t("Sleep")} subtitle={t("Asked with Vitals and lab results")} value={<ComingSoonPill />} />
            {CONSENT_SWITCHES.slice(3).map((s) => (
              <SettingsRow key={s.key} icon={ICONS[s.key]} title={t(s.title)} subtitle={s.sub ? t(s.sub) : undefined} toggle={{ checked: switchOn(cats, s.key), onChange: (v) => void flip(s.key, v), label: t(s.title) }} />
            ))}
          </>
        )}
      </SettingsSection>
      <SettingsSection label={t("Your responsibilities")}>
        <SettingsRow icon={FileLock} title={t("How you handle client data")} subtitle={t("Professional terms, section 4")} value={<ComingSoonPill />} />
        <SettingsRow icon={Download} title={t("Export a client record")} subtitle={t("For your own files, with consent")} value={<ComingSoonPill />} />
      </SettingsSection>
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </SubPage>
  );
}

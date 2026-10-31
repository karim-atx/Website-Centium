import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { ObSectionLabel, ObSwitch } from "../shell/ObBlocks";
import { PUBLISH_STRINGS, publishDesc, publishState, usePublishLicence } from "../../../components/cv/licencePublishState";
import type { Licence } from "../../../services/professional-cv";
import { t } from "../../../i18n/core";

/**
 * "Show on your profile", in the onboarding look (OURS-licence-publish). A
 * licence is never born public (20261120150000): uploading a proof, a degree or
 * a certificate creates the row hidden, and this is the separate, explicit
 * step that publishes it. Never switched on for the person. Credentials offers
 * it right after a licence exists; Review and the verification screen repeat
 * it so the choice is in view before and after going live.
 */
export const ProLicencePublish: React.FC<{
  licences: Licence[];
  onChanged: (l: Licence) => void;
  /** What an unnamed licence says instead of the switch's meaning. */
  unnamedHint?: string;
  margin?: string;
}> = ({ licences, onChanged, unnamedHint, margin = "8px 2px 4px" }) => {
  const { busyId, error, toggle } = usePublishLicence(onChanged);
  if (!licences.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <ObSectionLabel title={t("Show on your profile")} tag={t("Your choice")} margin={margin} />
      <p className="ob-tg-d" style={{ margin: "0 2px 4px" }}>
        {t(PUBLISH_STRINGS.onboardingIntro)}
      </p>
      {licences.map((l, k) => {
        const state = publishState(l);
        const on = !!l.publishedAt;
        const Icon = state === "public" ? Eye : EyeOff;
        const title = l.name ?? (l.mirrorsCertification ? t("Your certificate") : t("Your degree or certificate"));
        return (
          <div key={l.id} role="group" aria-label={title} className="ob-tg">
            {k > 0 && <span className="ob-tg-rule" />}
            <span className="ob-sq-ic">
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="ob-tg-t" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{title}</span>
                <span className="obp-pill" data-tone={state === "public" ? "accent" : "soft"}>
                  {state === "public" ? t(PUBLISH_STRINGS.public) : t(PUBLISH_STRINGS.notPublic)}
                </span>
              </span>
              <span className="ob-tg-d">{state === "unnamed" && unnamedHint ? unnamedHint : t(publishDesc(state))}</span>
              {error?.id === l.id && (
                <span role="alert" className="ob-tg-d" style={{ color: "var(--ob-high)", fontWeight: 600 }}>
                  {t(error.message)}
                </span>
              )}
            </span>
            <ObSwitch
              on={on}
              label={`${t(PUBLISH_STRINGS.label)}: ${title}`}
              onChange={(next) => void toggle(l, next)}
              disabled={(state === "unnamed" && !on) || busyId === l.id}
            />
          </div>
        );
      })}
    </div>
  );
};

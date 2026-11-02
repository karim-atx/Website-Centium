import React from "react";
import clsx from "clsx";
import { Toggle } from "../ui/Toggle";
import type { Licence } from "../../services/professional-cv";
import { PUBLISH_STRINGS, publishDesc, publishState, usePublishLicence, type PublishState } from "./licencePublishState";
import { t } from "../../i18n/core";

// The CV look of the publish choice; the rules and copy are in licencePublishState.ts.

/** The Public / Not public pill. Published but expired-and-hidden reads Not public: that is what clients get. */
export const PublishPill: React.FC<{ state: PublishState }> = ({ state }) => {
  const on = state === "public";
  return (
    <span
      className={clsx(
        "text-[11px] font-bold rounded-full px-[9px] py-1 whitespace-nowrap shrink-0",
        on ? "bg-primary/15 text-primary-deep-text" : "bg-charcoal/[0.06] text-charcoal-soft"
      )}
    >
      {on ? t(PUBLISH_STRINGS.public) : t(PUBLISH_STRINGS.notPublic)}
    </span>
  );
};

/**
 * One licence's "Show on my profile" row: the pill, what clients see, and the
 * switch. The switch is off and disabled until the licence has a name, since
 * the public view never lists an unnamed one.
 */
export const LicencePublishRow: React.FC<{
  licence: Licence;
  onChanged: (l: Licence) => void;
  className?: string;
}> = ({ licence, onChanged, className }) => {
  const { busyId, error, toggle } = usePublishLicence(onChanged);
  const state = publishState(licence);
  const id = `lic-pub-${licence.id}`;
  return (
    <div className={clsx("rounded-xl bg-cream-soft px-3 py-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span id={id} className="text-[13px] font-bold text-charcoal">
              {t(PUBLISH_STRINGS.label)}
            </span>
            <PublishPill state={state} />
          </span>
          <span className="text-xs leading-[1.4] text-charcoal-soft">{t(publishDesc(state))}</span>
        </div>
        <Toggle
          checked={!!licence.publishedAt}
          onChange={(on) => void toggle(licence, on)}
          label={`${t(PUBLISH_STRINGS.label)}: ${licence.name ?? t("licence")}`}
          disabled={(state === "unnamed" && !licence.publishedAt) || busyId === licence.id}
        />
      </div>
      {error?.id === licence.id && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-status-high">
          {error.message}
        </p>
      )}
    </div>
  );
};

import React from "react";
import { BellOff } from "lucide-react";
import { pushPermissionNow, pushSupported } from "../../services/push";
import type { DeviceReminderState } from "../../services/push/deviceReminderState";
import * as G from "../../services/contraception/guidance";
import { CycleHelp, type } from "./cycleUi";
import { t } from "../../i18n/core";

/**
 * FW (G13): the line under a cycle or contraception reminder switch when THIS
 * device can't receive it (useDeviceReminderPush): why, and the one tap that
 * fixes it. The contraception Reminders section's line, moved here unchanged
 * in look so the period reminder shows the same one. Nothing while the state
 * is "on" or still being read.
 */
export const ReminderPushLine: React.FC<{
  state: DeviceReminderState;
  busy: boolean;
  error: string | null;
  onTurnOn: () => void;
  style?: React.CSSProperties;
}> = ({ state, busy, error, onTurnOn, style }) => {
  if (state === "on" || state === "checking") return null;
  // Granted but not registered: say so, rather than "needs permission".
  const unregistered = state === "needed" && pushSupported() && pushPermissionNow() === "granted";
  return (
    <div className="flex" style={{ gap: 8, marginTop: 12, ...style }}>
      <BellOff size={14} aria-hidden className="shrink-0 text-charcoal-faint" style={{ marginTop: 2 }} />
      <div className="min-w-0">
        <CycleHelp>
          {state === "unsupported" ? t(G.PUSH_UNSUPPORTED) : state === "blocked" ? t(G.PUSH_BLOCKED) : unregistered ? t(G.PUSH_NOT_REGISTERED) : t(G.PUSH_NEEDED)}
        </CycleHelp>
        {state === "needed" && (
          <button
            type="button"
            onClick={onTurnOn}
            disabled={busy}
            className="tap text-primary-dark disabled:opacity-40"
            style={{ minHeight: 36, ...type(13, 19.5, 700) }}
          >
            {unregistered ? t(G.PUSH_ENABLE_HERE) : t(G.PUSH_ENABLE)}
          </button>
        )}
        {error && (
          <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginTop: 4 })}>
            {t(error)}
          </p>
        )}
      </div>
    </div>
  );
};

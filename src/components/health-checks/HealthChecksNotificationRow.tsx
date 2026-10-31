import React from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import clsx from "clsx";
import { Toggle } from "../ui/Toggle";
import { settingsRowClass } from "../ui/SettingsRows";
import { textPx } from "../../theme/textSize";
import { useApp } from "../../context/AppContext";
import { useHealthCheckStore, type CustomCheck } from "../../services/health-checks/checkStore";
import { screeningRows } from "../../services/health-checks/screening";
import { t, tn } from "../../i18n/core";

/** A check's name by id: every catalogue check (both sexes, the widest ages) and the user's own. */
export function checkNameOf(id: string, custom: CustomCheck[]): string {
  const own = custom.find((c) => c.id === id);
  if (own) return own.name;
  const all = [
    ...screeningRows({ age: 55, sex: "female", bmi: 30, recoverySensitive: false }),
    ...screeningRows({ age: 60, sex: "male", bmi: 30, recoverySensitive: false }),
  ];
  return all.find((r) => r.id === id)?.title ?? id;
}

// MO1.8.3 #31-#36 (health-b-handover.md 522-613): the Reminders group's
// "Health checks" row, after Water. ClipboardCheck 18 #7D6BB5 (dark #C3B3FB)
// in the 36 r11 tile, "Health checks" 14/19 600, the count line 11/15 400
// #8C8378 (dark #B8B3C7) that opens the reminders list, and the switch:
// app_preferences.notification_health_checks (B4), which pauses every
// health-check reminder without deleting them. It dims with every other
// row when Allow notifications is off (A2 rule). The push itself never names
// the check (V6-10; B4 body "You have a health check due").

/** "1 reminder · Bowel cancer screening" / "2 reminders · Blood pressure, Bowel cancer screening" / "No reminders yet". */
export function reminderCountLine(names: string[]): string {
  if (names.length === 0) return t("No reminders yet");
  return tn(names.length, "{n} reminder · {names}", "{n} reminders · {names}", { names: names.join(t(", ")) });
}

export const HealthChecksNotificationRow: React.FC<{
  dimmed: boolean;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}> = ({ dimmed, checked, disabled, onChange }) => {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const store = useHealthCheckStore(authUserId);
  const names = store.reminders.map((r) => checkNameOf(r.checkId, store.custom));
  return (
    <div inert={dimmed || undefined} aria-disabled={dimmed || undefined} className={clsx(settingsRowClass, dimmed && "opacity-40")}>
      <span aria-hidden className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 bg-primary-pale text-th-7d6bb5 dark:text-primary-deep-text">
        <ClipboardCheck size={18} strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold leading-[19px] text-charcoal">{t("Health checks")}</span>
        <button
          type="button"
          onClick={() => navigate("/app/settings/notifications/health-checks")}
          className="tap block max-w-full truncate text-start text-charcoal-faint"
          style={{ fontSize: textPx(11), lineHeight: "15px" }}
        >
          {store.status === "ready" ? reminderCountLine(names) : " "}
        </button>
      </span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={t("Health checks")} />
    </div>
  );
};

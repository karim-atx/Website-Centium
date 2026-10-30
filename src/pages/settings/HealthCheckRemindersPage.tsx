import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ClipboardCheck, Trash2 } from "lucide-react";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { Toast } from "../../components/ui/Toast";
import { Toggle } from "../../components/ui/Toggle";
import { CheckTile, InfoBox } from "../../components/health-checks/HealthCheckParts";
import { CheckReminderSheet, NotificationsOffLine, type CheckOption } from "../../components/health-checks/HealthCheckPopups";
import { checkNameOf } from "../../components/health-checks/HealthChecksNotificationRow";
import { hairAt } from "../../components/health/log/LogSheetParts";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { checkStoreActions, repeatLabel, useHealthCheckStore, type CheckReminder } from "../../services/health-checks/checkStore";
import { cadenceOf, shortDate } from "../../services/health-checks/checkStatus";
import { fetchNotificationPrefs, saveNotificationPrefs } from "../../services/preferences";
import { time12 } from "../../utils/time12";
import { todayLocal } from "../../utils/date";

// OURS-health-check-reminders: the list MO1.8.3's Health checks count line
// opens. One row per health-check reminder (each opens HE1.8.2 to edit),
// swipe to remove with Undo, and the same pause switch as MO1.8.3.
// BACKEND B4: reachable only once per-check reminders exist (the count line
// is "Coming soon" until then); a direct visit before that shows the empty
// state. Never personal_reminders, never the monitoring plan.

export default function HealthCheckRemindersPage() {
  const navigate = useNavigate();
  const back = useBack();
  const dark = useIsDark();
  const { authUserId } = useApp();
  const store = useHealthCheckStore(authUserId);
  // app_preferences.notification_health_checks (B4); null until read.
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CheckReminder | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [allowOff, setAllowOff] = useState(false);
  const today = todayLocal();

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchNotificationPrefs(authUserId).then((r) => {
      if (live && r.status === "ok") {
        setAllowOff(!r.prefs.allow);
        setOn(r.prefs.healthChecks);
      }
    });
    return () => {
      live = false;
    };
  }, [authUserId]);

  const reminders = store.reminders;
  const paused = on === false || allowOff;
  const setPaused = async (next: boolean) => {
    if (!authUserId || on === null) return;
    setSaving(true);
    setOn(next);
    const r = await saveNotificationPrefs(authUserId, { healthChecks: next });
    setSaving(false);
    if (r.status !== "ok") {
      setOn(!next);
      setToast({ message: "Couldn't save. Try again." });
    }
  };
  const checks: CheckOption[] = reminders.map((r) => ({
    id: r.checkId,
    name: checkNameOf(r.checkId, store.custom),
    frequency: "",
    cadence: cadenceOf({ id: r.checkId, frequency: "" }),
  }));
  const sub = { fontSize: textPx(11), lineHeight: "15px" } as const;

  return (
    <div style={{ paddingBottom: 96 }}>
      <FixedHeader paddingBottom={10}>
        <div className="flex items-center" style={{ gap: 6, marginInlineStart: -7.5, minHeight: 36 }}>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? back() : navigate("/app/settings/notifications"))}
            aria-label="Back"
            className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
            style={{ width: 36, height: 36 }}
          >
            <ChevronLeft size={20} className="text-charcoal-soft" aria-hidden />
          </button>
          <h1 className="flex-1 min-w-0 text-charcoal" style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5 }}>
            Health-check reminders
          </h1>
        </div>
      </FixedHeader>

      {allowOff && <NotificationsOffLine onTurnOn={() => navigate("/app/settings/notifications")} style={{ marginTop: 2, marginBottom: 12 }} />}
      <InfoBox style={{ marginTop: 2 }}>
        <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(12), lineHeight: "18px" }}>
          Reminders for the checks you chose. They follow Allow notifications and quiet hours.
        </p>
      </InfoBox>

      <div className="flex items-center bg-cream-card" style={{ marginTop: 16, gap: 14, minHeight: 50 }}>
        <span aria-hidden className="w-9 h-9 rounded-[11px] grid place-items-center shrink-0 bg-primary-pale text-th-7d6bb5 dark:text-primary-deep-text">
          <ClipboardCheck size={18} strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-charcoal" style={{ fontSize: textPx(14), lineHeight: "19px", fontWeight: 600 }}>
          Health checks
        </span>
        <Toggle checked={on ?? false} disabled={on === null || saving} onChange={(v) => void setPaused(v)} label="Health checks" />
      </div>

      <p className="text-primary-accent" style={{ margin: "24px 0 0", fontSize: textPx(11), lineHeight: "14px", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
        Your reminders
      </p>
      <div className="bg-th-aea1dc dark:bg-primary-fill" style={{ height: 1.5, marginTop: 8 }} aria-hidden />

      {reminders.length === 0 ? (
        <div className="text-center" style={{ marginTop: 24 }}>
          <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(13), lineHeight: "19.5px" }}>
            No reminders yet.
          </p>
          <button
            type="button"
            onClick={() => navigate("/app/health/checks", { state: { plan: "general" } })}
            className="tap text-th-7d6bb5 dark:text-primary-deep-text"
            style={{ marginTop: 4, minHeight: 32, fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 700 }}
          >
            Set one from Your health checks.
          </button>
        </div>
      ) : (
        <>
          {paused && (
            <p className="text-charcoal-soft" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: "18px" }}>
              Paused. Turn Health checks on to get these.
            </p>
          )}
          <div className={paused ? "opacity-40" : undefined} style={{ marginTop: 12 }}>
            {reminders.map((r, i) => (
              <SwipeActions
                key={r.checkId}
                radius={0}
                tileMax={45}
                tileRadius={12}
                edgeInset={8.5}
                keyboardLabel={checkNameOf(r.checkId, store.custom)}
                actions={[
                  {
                    key: "delete",
                    label: "Remove reminder",
                    icon: <Trash2 size={16} />,
                    destructive: true,
                    onClick: () => {
                      void checkStoreActions.removeReminder(r.checkId).then((res) =>
                        setToast(res.ok ? { message: "Reminder removed.", undo: () => void checkStoreActions.setReminder({ ...r, id: undefined }) } : { message: "Couldn't save. Try again." })
                      );
                    },
                  },
                ]}
              >
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  className="tap w-full flex items-center bg-cream-card text-start"
                  style={{ minHeight: 72, paddingBlock: "10px", paddingInline: "12px 14px", gap: 10, borderTop: i > 0 ? `0.5px solid ${hairAt(dark, 0.05)}` : undefined }}
                >
                  <CheckTile id={r.checkId.startsWith("custom-") ? "custom" : r.checkId} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-charcoal truncate" style={{ fontSize: textPx(13.5), lineHeight: "18px", fontWeight: 600 }}>
                      {checkNameOf(r.checkId, store.custom)}
                    </span>
                    <span className="block text-charcoal-faint" style={{ ...sub, marginTop: 2 }}>
                      {shortDate(r.date)} · {time12(r.time)} · {repeatLabel(r.repeat)}
                    </span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-charcoal-faint" aria-hidden />
                </button>
              </SwipeActions>
            ))}
          </div>
        </>
      )}

      {editing && (
        <CheckReminderSheet
          open={!!editing}
          onClose={() => setEditing(null)}
          checks={checks}
          initial={editing}
          editing
          notificationsOff={allowOff}
          today={today}
          onSave={(r) => checkStoreActions.setReminder(r)}
          onRemove={(id) => checkStoreActions.removeReminder(id)}
        />
      )}
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        onUndo={
          toast?.undo
            ? () => {
                toast.undo?.();
                setToast(null);
              }
            : undefined
        }
        onExpire={() => setToast(null)}
      />
    </div>
  );
}

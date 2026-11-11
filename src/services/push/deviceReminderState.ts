// FW (G13): can THIS device receive a reminder? Pure, so the cycle and
// contraception switches and their tests share one answer.
//
// PERMISSION ALONE IS NOT ENOUGH. A browser can say "granted" with no
// push_subscriptions row behind it (a subscription removed by another tab,
// a failed registration, a cleared site), and then nothing the server queues
// reaches it. So a reminder switch opens only when the permission is granted
// AND this device is registered (services/push isThisDeviceRegistered; the
// phone app asks register_push_device, the desktop app its Windows setting).

export type DeviceReminderState =
  /** This browser can't receive push at all. */
  | "unsupported"
  /** The person (or the OS) said no; only their settings can undo it. */
  | "blocked"
  /** Not asked yet, or allowed but this device isn't registered: one tap fixes it. */
  | "needed"
  /** The registration is still being read: show nothing yet. */
  | "checking"
  /** Allowed and registered: reminders arrive here. */
  | "on";

export function deviceReminderState(input: {
  supported: boolean;
  /** NotificationPermission, spelled out: this file is also compiled without the DOM lib. */
  permission: "default" | "denied" | "granted";
  /** isThisDeviceRegistered(): null while unread (or unreadable). */
  registered: boolean | null;
}): DeviceReminderState {
  if (!input.supported) return "unsupported";
  if (input.permission === "denied") return "blocked";
  if (input.permission !== "granted") return "needed";
  if (input.registered === null) return "checking";
  return input.registered ? "on" : "needed";
}

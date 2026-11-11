// Where a phone's push registration stopped, and what Settings says about it.
//
// Turning on notifications in the app is four steps: the phone's permission,
// the push token from Apple (APNs) or Google (FCM), register_push_device, and
// the check that this account can see its push_devices row. On the iPhone
// (TestFlight, 2026-11-11) "Registering this device…" ran for a long time and
// ended in the one message every failure shared, "Couldn't register for
// notifications.", so nobody could tell which step stopped. Each step now has
// a time limit and its own message.
export type PushRegistrationFailure =
  /** The phone's push service sent no token within TOKEN_TIMEOUT_MS. */
  | "no-token"
  /** The phone's push service refused (the plugin's registrationError). */
  | "refused"
  /** register_push_device failed, threw or took longer than SAVE_TIMEOUT_MS. */
  | "save"
  /** Saved, but this account's push_devices row couldn't be read back. */
  | "check";

/** APNs and FCM usually answer within a second or two. */
export const TOKEN_TIMEOUT_MS = 30_000;
export const SAVE_TIMEOUT_MS = 20_000;

/** Which step a registration that ended without a token stopped at. */
export function failedStep(tokenArrived: boolean, step: PushRegistrationFailure | null): PushRegistrationFailure {
  return step ?? (tokenArrived ? "save" : "no-token");
}

export function pushRegistrationMessage(failure: PushRegistrationFailure): string {
  switch (failure) {
    case "no-token":
      return "The phone's notification service didn't answer. Try again in a minute.";
    case "refused":
      return "The phone's notification service turned this device down.";
    case "save":
      return "Couldn't save this device for notifications. Try again.";
    case "check":
      return "Couldn't confirm this device for notifications. Try again.";
  }
}

/** A promise that rejects after `ms`, for calls that otherwise could wait forever. */
export function withTimeout<T>(work: PromiseLike<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms} ms`)), ms);
  });
  return Promise.race([Promise.resolve(work), late]).finally(() => clearTimeout(timer));
}

// Where a phone's push registration stopped, and what Settings says about it.
//
// Turning on notifications in the app is three steps: the phone's permission,
// the push token from Apple (APNs) or Google (FCM), and register_push_device.
// On the iPhone (TestFlight, 2026-11-11) "Registering this device…" ran for a
// long time and ended in "Couldn't register for notifications." although the
// row was saved (10:54:14 UTC): the tap waited on a token the launch's
// registration had already taken, nothing had a time limit, and the outcome
// came from reading push_devices back, not from the save. Now the save
// decides, every wait ends, and each failure has its own message.
export type PushRegistrationFailure =
  /** The phone's push service sent no token within TOKEN_TIMEOUT_MS. */
  | "no-token"
  /** The phone's push service refused (the plugin's registrationError). */
  | "refused"
  /** register_push_device failed, threw or took longer than SAVE_TIMEOUT_MS. */
  | "save";

/** APNs and FCM usually answer within a second or two. */
export const TOKEN_TIMEOUT_MS = 30_000;
export const SAVE_TIMEOUT_MS = 20_000;
/** When this run already saved a token: how long a repeat registration waits for a new one. */
export const SAVED_TOKEN_WAIT_MS = 5_000;

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

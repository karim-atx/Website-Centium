/**
 * Asking for a camera and a microphone, and saying something useful when the
 * answer is no.
 *
 * SEPARATE REQUESTS, NOT ONE COMBINED CALL, and this is the whole reason the
 * module exists. `getUserMedia({ audio: true, video: true })` rejects as a
 * single error: one name, one message, no indication of which device was
 * refused. Someone who has blocked their camera but allows their microphone is
 * perfectly able to take a voice call, and a combined request turns that into
 * a total failure. Asking twice costs a second prompt on a first run and buys
 * the ability to offer the call that can actually happen.
 *
 * FOUR OUTCOMES, NOT TWO. The existing `describeMediaError` in
 * useVoiceRecorder distinguishes denied from no-device, which is already more
 * than most of this app does. Calling needs two more:
 *
 *   NotReadableError     the device exists and is permitted, and something
 *                        else is holding it — another tab, Zoom, the OS
 *                        camera app. "Try again" is actively wrong advice
 *                        here; nothing changes until the other program lets
 *                        go. This is the most common camera failure in
 *                        practice and was unhandled anywhere in this codebase.
 *
 *   OverconstrainedError the device exists and is free but cannot satisfy the
 *                        constraints asked for. Only reachable when a call
 *                        requests a specific resolution or facing mode, so it
 *                        is a bug signal rather than something a user can fix.
 *
 * NOTHING HERE KEEPS A STREAM. Every track is stopped before returning: this
 * module answers "may we?", and the call screen opens its own capture through
 * LiveKit moments later. A live track left behind would sit with the browser's
 * recording indicator on while a call is still being negotiated, which is the
 * same reason useVoiceRecorder releases so carefully.
 */

import { t } from "../i18n/core";

export type MediaKind = "camera" | "microphone";

export type MediaDenialKind =
  | "denied"
  | "no-device"
  | "in-use"
  | "unsupported-constraints"
  | "unsupported"
  | "failed";

export interface MediaDenial {
  kind: MediaDenialKind;
  message: string;
  /** Which device was being asked for, so a caller can offer the other one. */
  device: MediaKind;
}

export type MediaCheck = { ok: true } | { ok: false; denial: MediaDenial };

// One whole sentence per device (Round F): the device word changes the
// sentence around it in Arabic, so it is never slotted into one sentence.
// Called when a request fails, so in the chosen language.
const SAY: Record<MediaKind, Record<"denied" | "no-device" | "in-use" | "unsupported-constraints" | "failed", () => string>> = {
  camera: {
    denied: () => t("Access to your camera is blocked. Allow it in your browser settings."),
    "no-device": () => t("No camera found on this device."),
    "in-use": () => t("Another app is using your camera. Close it and try again."),
    "unsupported-constraints": () => t("Your camera doesn't support what this call needs."),
    failed: () => t("Couldn't start your camera."),
  },
  microphone: {
    denied: () => t("Access to your microphone is blocked. Allow it in your browser settings."),
    "no-device": () => t("No microphone found on this device."),
    "in-use": () => t("Another app is using your microphone. Close it and try again."),
    "unsupported-constraints": () => t("Your microphone doesn't support what this call needs."),
    failed: () => t("Couldn't start your microphone."),
  },
};

/**
 * Turns a getUserMedia rejection into a sentence naming the right device.
 *
 * The names are the spec's and they mean genuinely different things — a denial
 * is a decision the user can revisit in settings, a missing device is not, and
 * a busy device is neither. Exported because the call screen maps the same
 * errors when LiveKit re-opens capture.
 */
export function describeMediaDenial(err: unknown, device: MediaKind): MediaDenial {
  const name = (err as { name?: string })?.name ?? "";
  const say = SAY[device];

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return { kind: "denied", device, message: say.denied() };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return { kind: "no-device", device, message: say["no-device"]() };
    case "NotReadableError":
    case "TrackStartError":
      // Deliberately does NOT say "try again": retrying changes nothing while
      // another program holds the device.
      return { kind: "in-use", device, message: say["in-use"]() };
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return { kind: "unsupported-constraints", device, message: say["unsupported-constraints"]() };
    default:
      return { kind: "failed", device, message: say.failed() };
  }
}

/** Whether this browser can capture at all. */
export function mediaCaptureSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Asks for ONE device and releases it immediately.
 *
 * The stream is the permission, not the capture. Holding it would leave the
 * recording indicator lit between this check and LiveKit's own connection.
 */
async function probe(device: MediaKind): Promise<MediaCheck> {
  if (!mediaCaptureSupported()) {
    return {
      ok: false,
      denial: {
        kind: "unsupported",
        device,
        message: t("This browser can't access your camera or microphone."),
      },
    };
  }
  try {
    const constraints: MediaStreamConstraints =
      device === "camera" ? { video: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    return { ok: false, denial: describeMediaDenial(err, device) };
  }
}

export const requestMicrophone = (): Promise<MediaCheck> => probe("microphone");
export const requestCamera = (): Promise<MediaCheck> => probe("camera");

export interface CallMediaReadiness {
  /** A call can go ahead in some form. False means not even voice is possible. */
  canCall: boolean;
  audio: MediaCheck;
  video: MediaCheck | null;
  /** True when video was asked for and refused but audio succeeded. */
  degradedToVoice: boolean;
  /** The single sentence worth showing, or null when everything was granted. */
  message: string | null;
}

/**
 * Checks what kind of call this browser can actually place.
 *
 * AUDIO FIRST, AND ITS FAILURE IS FATAL. A call with no microphone is not a
 * call in either direction — there is no "video-only" product here — so a
 * denied microphone stops the whole thing and the camera is never asked for.
 * Asking anyway would raise a second prompt for a call that cannot happen.
 *
 * VIDEO FAILURE IS NOT FATAL, which is the point of asking separately. A
 * refused camera downgrades a video call to voice and says why, rather than
 * failing something the user can still do.
 */
export async function checkCallMedia(kind: "video" | "voice"): Promise<CallMediaReadiness> {
  const audio = await probe("microphone");
  if (!audio.ok) {
    return {
      canCall: false,
      audio,
      video: null,
      degradedToVoice: false,
      message: audio.denial.message,
    };
  }

  if (kind === "voice") {
    return { canCall: true, audio, video: null, degradedToVoice: false, message: null };
  }

  const video = await probe("camera");
  if (video.ok) {
    return { canCall: true, audio, video, degradedToVoice: false, message: null };
  }

  return {
    canCall: true,
    audio,
    video,
    degradedToVoice: true,
    message: t("{reason} Starting as a voice call.", { reason: video.denial.message }),
  };
}

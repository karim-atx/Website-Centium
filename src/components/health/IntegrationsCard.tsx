// V4: "Integration should be based on the device whether iOS or Android, do
// not include both" — detect the platform and show only the matching
// integration instead of offering both toggles side by side.
export function detectPlatform(): "ios" | "android" {
  if (typeof navigator === "undefined") return "ios";
  return /android/i.test(navigator.userAgent) ? "android" : "ios";
}

// The Settings card that lived here ("Device sync, said honestly: it is not
// built") became the Connected devices rows in Settings (batch C, C16), which
// keep its wording: no switch, "Coming soon", and the same footnote.

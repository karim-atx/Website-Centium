import { useEffect, useState } from "react";

// Whether the operating system asks for dark. Read only for theme 'auto', the
// device_presentation_settings value that defers to the system; the Settings
// Dark Mode switch itself always stores light or dark.
const query = (): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

export function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const mq = query();
    if (!mq) return;
    const onChange = () => setDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

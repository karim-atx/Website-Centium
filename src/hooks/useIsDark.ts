import { useApp } from "../context/AppContext";

/**
 * Whether the app is in dark mode, for the few components that compute colours
 * in script (folder, set-type and level shades) instead of through the
 * index.css tokens. Mobile v5.1 R3: dark mode has no light islands.
 */
export const useIsDark = (): boolean => useApp().theme === "dark";

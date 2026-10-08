import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";

/**
 * The Messages list's colours (v6 MO1.7 / MO1.7.e), light / dark, as the
 * frame-check tables give them. Grey inks ride the charcoal tokens (#241F1B /
 * #F5F3FA, #5B5349 / #B8B3C7, #8C8378 / #B8B3C7), so High contrast takes them
 * to #111111 / #F5F3FA (O7). Lavender ("theme primary") values ride the
 * theme's own twins, so the five colour themes recolour them (O12) and High
 * contrast lifts the inks (the `thi-` twin). The neutral, teal and danger
 * pairs are literal: they are not theme colours.
 *
 * Dark values marked * in the table that fail contrast take the app's dark
 * token (V6-92), each recorded in MO1.7.md: Delete ink #F09A8E, row hairline
 * #F5F3FA@8%, sub-tab track #242730 (V6-93).
 */
export function useListColors() {
  const dark = useIsDark();
  const { accessibility, colorTheme } = useApp();
  const hc = !!accessibility.highContrast;
  const pick = (light: string, darkValue: string) => (dark ? darkValue : light);
  return {
    dark,
    hc,
    colorTheme,
    /** text.primary #241F1B / #F5F3FA. */
    ink: "rgb(var(--c-charcoal))",
    /** #5B5349 / #B8B3C7. */
    inkSoft: "rgb(var(--c-charcoal-soft))",
    /** #8C8378 / #B8B3C7. */
    muted: "rgb(var(--c-charcoal-muted))",
    /** Primary ink #7D6BB5 / #C3B3FB (High contrast: the lifted twin). */
    primaryInk: pick("rgb(var(--thi-7d6bb5))", "rgb(var(--thi-c3b3fb))"),
    /** Primary tint #F0EDF9 / #303141 (the Pin tile, the Starred button, empty tiles). */
    primaryTint: pick("rgb(var(--th-f0edf9))", "rgb(var(--th-303141))"),
    /** The row fill #FFFFFF / #1C1F28 (MO1.7 #14). */
    rowFill: "rgb(var(--c-cream-card))",
    /** Row separator 0.5 #E5E7EB / #F5F3FA@8% (MO1.7 #13; dark derived); ink@30% in High contrast. */
    rowRule: hc ? (dark ? "rgb(245 243 250 / 0.3)" : "rgb(17 17 17 / 0.3)") : pick("#E5E7EB", "rgba(245,243,250,0.08)"),
    /** Search field #F5F5F6 + 0.5 #241F1B@6% / #242730 + 0.5 #F5F3FA@6% (MO1.7 #7). */
    fieldFill: "rgb(var(--c-cream-soft))",
    fieldBorder: hc ? (dark ? "rgb(245 243 250 / 0.3)" : "rgb(17 17 17 / 0.3)") : pick("rgba(36,31,27,0.06)", "rgba(245,243,250,0.06)"),
    /** Neutral pair: the Mute tile and the gym tile (#EDEFF3 / #262932*, ink #5F6878 / #B8C0CE*). */
    neutralFill: pick("#EDEFF3", "#262932"),
    neutralInk: pick("#5F6878", "#B8C0CE"),
    /** Official teal pair (MO1.2's teal: #E1EEEB / #293339, ink #3C6B65 / #93C1B9). */
    tealFill: pick("#E1EEEB", "#293339"),
    tealInk: pick("#3C6B65", "#93C1B9"),
    /** Broadcast gold pair (MO1.2.1.5.2 #13: #FBF3E2 / #3A3222*, ink #9A7424 / dark the app's gold). */
    goldFill: pick("#FBF3E2", "#3A3222"),
    goldInk: pick("#9A7424", "#E0B360"),
    /** Danger pair: the Delete tile (#FCEDEC / #3C2A30, ink #B42318 / #F09A8E). */
    dangerFill: pick("#FCEDEC", "#3C2A30"),
    dangerInk: pick("#B42318", "#F09A8E"),
    /** Menu / error danger text #C0392B / #F09A8E (status-high). */
    dangerText: "rgb(var(--c-status-high))",
    /** Unread badge: theme primary #9A8CD6 / #A991FE with white / #0D0B1A (#5B48B8 in High contrast). */
    badgeFill: "rgb(var(--c-fill-pinned))",
    badgeInk: "rgb(var(--c-on-primary-fill))",
    /** Skeleton #F5F5F6 / #242730. */
    skeleton: "rgb(var(--c-cream-soft))",
  };
}

export type ListColors = ReturnType<typeof useListColors>;

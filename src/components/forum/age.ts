import { forumAge } from "../../services/forum/rules";
import { t } from "../../i18n/core";

// Round G (EH3b): forumAge's meta-line ages ("Just now", "40m", "2h",
// "Yesterday", "3d") in the app's language. English reads exactly as
// forumAge returns it.

/** The short age of a post or reply, translated. */
export function forumAgeText(iso: string, now?: number): string {
  const age = forumAge(iso, now);
  const m = /^(\d+)([mhd])$/.exec(age);
  if (!m) return age === "Just now" ? t("Just now") : age === "Yesterday" ? t("Yesterday") : age;
  const n = Number(m[1]);
  return m[2] === "m" ? t("{n}m", { n }) : m[2] === "h" ? t("{n}h", { n }) : t("{n}d", { n });
}

/** "Pinned · 40d", or with `ago` "38d ago" (MO1.3); "Just now" and "Yesterday" as they are. */
export function forumMetaLine(iso: string, pinned: boolean, ago: boolean): string {
  const age = forumAgeText(iso);
  if (pinned) return t("Pinned · {age}", { age });
  return ago && /^\d+[mhd]$/.test(forumAge(iso)) ? t("{age} ago", { age }) : age;
}

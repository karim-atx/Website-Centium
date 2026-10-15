import { useIsDark } from "../../hooks/useIsDark";
import type { MessageThread } from "../../services/messaging";

// The business chat's avatar rules and literal colour pairs (OP1-190, OP1-180
// row 4, AN14-058 row 1), shared by the business list (BusinessList.tsx,
// ThreadList) and the business chat header (ThreadView cv2).

/** Literal pairs no token carries (maskBg dark, tealInk light, readTick, online). */
export function useBizChatColours() {
  const dark = useIsDark();
  return {
    dark,
    maskBg: dark ? "#262932" : "#F5F5F6",
    tealInk: dark ? "#B2D4CF" : "#3E6B67",
    readTick: dark ? "#7FB0F0" : "#3A7BD5",
    online: "#3F9165",
  };
}

/**
 * Who the avatar shows (source PEOPLE): a member of this business is masked
 * (user-round on maskBg; members are masked, HANDOVER §4), Centium support is
 * the life-buoy on tealPale, a group the Users glyph, anyone else their photo
 * or initials on pale / pDark.
 */
export type BizAvatarKind = "member" | "support" | "group" | "photo" | "initials";
export function bizAvatarKind(t: Pick<MessageThread, "kind" | "venue" | "participantAvatarUrl">): BizAvatarKind {
  if (t.kind === "group") return "group";
  if (t.kind === "official_support") return "support";
  // A venue chat seen from the business side: the other person is a member.
  if (t.venue && !t.venue.memberSide) return "member";
  if (t.participantAvatarUrl) return "photo";
  return "initials";
}

/** "John N." → "JN"; one word → its first letter (source `ini`). */
export function bizInitials(name: string): string {
  const words = name.replace(/·.*$/, "").trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

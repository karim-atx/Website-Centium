import type { Catalogue } from "../core";

// Website viewport v1, Arabic: the client More destinations on web (area 7,
// "client-more": My Profile, Centium Premium, Referral, the client More
// column) at 1024px and wider. Labels the mobile screens already use keep
// their Arabic from the existing areas; only the web-only words are here.

// Source files this catalogue covers (paths from src/).
export const FILES: string[] = [
  "pages/profile/More.web.tsx",
  "pages/profile/Profile.web.tsx",
  "pages/profile/web/moWeb.tsx",
  "pages/subscription/Subscription.web.tsx",
];

const webclientmore: Catalogue = {
  // == My Profile (pages/profile/Profile.web, WC-MO.1): the stat tiles' caps labels ==
  Age: "العمر",
};

export default webclientmore;

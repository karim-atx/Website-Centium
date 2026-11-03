import type { Catalogue } from "../core";

// Website viewport v1, Arabic: the web shell (sidebars, the More and Settings
// columns) and the web pages at 1024px and wider. Mobile copy is unchanged; the
// web-only copy says "Click" where the handover lists it (7.3). Labels the
// mobile screens already use (Home, Settings, More, Roles and permissions…)
// keep their Arabic from the existing areas.
//
// note (whole file): "Main navigation" is the sidebar's accessible name
// «التنقل الرئيسي»; "Explore and connect" names its lower list.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "components/web/SidebarParts.tsx",
  "components/web/WebClientSidebar.tsx",
  "components/web/WebBusinessSidebar.tsx",
  "components/web/WebLayout.tsx",
  "components/web/WebSecondaryLayout.tsx",
];

const web: Catalogue = {
  // == The sidebars (components/web/WebClientSidebar, WebBusinessSidebar) ==
  "Main navigation": "التنقل الرئيسي",
  "Explore and connect": "استكشف وتواصل",

  // == More and Settings columns (components/web/WebSecondaryLayout) ==
  "{title} sections": "أقسام {title}",
};

export default web;

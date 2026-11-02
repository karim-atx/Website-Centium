import type { Catalogue } from "../core";
import core from "./core";
import landing from "./landing";
import legal from "./legal";
import auth from "./auth";
import settings from "./settings";
import plans from "./plans";
import messages from "./messages";
import notifications from "./notifications";
import services from "./services";
import shared from "./shared";
import programmes from "./programmes";
import safety from "./safety";
import venues from "./venues";
import certificates from "./certificates";
import marketplace from "./marketplace";
import market from "./market";
import share from "./share";
import member from "./member";
import community from "./community";
import findpros from "./findpros";
import misc from "./misc";

// Round F (AV): the Arabic catalogue, one file per area, loaded as one lazy
// chunk when Arabic is chosen. Every entry is in design-handover/round-f/
// ARABIC_REVIEW.md for Karim's review before merge. A key in two areas has
// the same Arabic in both (the catalogue test checks).
const ar: Catalogue = { ...core, ...landing, ...legal, ...auth, ...settings, ...plans, ...messages, ...notifications, ...services, ...shared, ...programmes, ...safety, ...venues, ...certificates, ...marketplace, ...market, ...share, ...member, ...community, ...findpros, ...misc };

export default ar;

// The legal pages' Arabic (whole modules with the English files' shape), read
// through documentFor() in i18n/core.
export { documents } from "./documents";

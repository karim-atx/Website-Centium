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
import sharedbiz from "./sharedbiz";
import sharedmember from "./sharedmember";
import sharedfood from "./sharedfood";
import sharedhealth from "./sharedhealth";
import sharedpro from "./sharedpro";
import pro from "./pro";
import proclients from "./proclients";
import proprofile from "./proprofile";
import procalendar from "./procalendar";
import promessages from "./promessages";
import prolibrary from "./prolibrary";
import pronutrition from "./pronutrition";
import proforms from "./proforms";
import proinsights from "./proinsights";
import provitals from "./provitals";
import procourses from "./procourses";
import pronetwork from "./pronetwork";
import promarket from "./promarket";
import premium from "./premium";
import premium2 from "./premium2";
import premium3 from "./premium3";
import premium4 from "./premium4";

// Round F (AV): the Arabic catalogue, one file per area, loaded as one lazy
// chunk when Arabic is chosen. Every entry is in design-handover/round-f/
// ARABIC_REVIEW.md for Karim's review before merge. A key in two areas has
// the same Arabic in both (the catalogue test checks).
const ar: Catalogue = { ...core, ...landing, ...legal, ...auth, ...settings, ...plans, ...messages, ...notifications, ...services, ...shared, ...programmes, ...safety, ...venues, ...certificates, ...sharedbiz, ...sharedmember, ...sharedfood, ...sharedhealth, ...sharedpro, ...pro, ...proclients, ...proprofile, ...procalendar, ...promessages, ...prolibrary, ...pronutrition, ...proforms, ...proinsights, ...provitals, ...procourses, ...pronetwork, ...promarket, ...premium, ...premium2, ...premium3, ...premium4 };

export default ar;

// The legal pages' Arabic (whole modules with the English files' shape), read
// through documentFor() in i18n/core.
export { documents } from "./documents";

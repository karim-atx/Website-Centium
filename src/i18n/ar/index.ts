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
import health from "./health";
import cycle from "./cycle";
import food from "./food";
import workout from "./workout";
import mind from "./mind";
import business from "./business";
import bizanalytics from "./bizanalytics";
import bizrevenue from "./bizrevenue";
import bizops from "./bizops";
import bizmarket from "./bizmarket";
import bizteam from "./bizteam";
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
import premium5 from "./premium5";
import web from "./web";
import webclienthealth from "./webclienthealth";

// Round F (AV): the Arabic catalogue, one file per area, loaded as one lazy
// chunk when Arabic is chosen. Every entry is in design-handover/round-f/
// ARABIC_REVIEW.md for Karim's review before merge. A key in two areas has
// the same Arabic in both (the catalogue test checks).
const ar: Catalogue = { ...core, ...landing, ...legal, ...auth, ...settings, ...plans, ...messages, ...notifications, ...services, ...shared, ...programmes, ...safety, ...venues, ...certificates, ...marketplace, ...market, ...share, ...member, ...community, ...findpros, ...misc, ...health, ...cycle, ...food, ...workout, ...mind, ...business, ...bizanalytics, ...bizrevenue, ...bizops, ...bizmarket, ...bizteam, ...sharedbiz, ...sharedmember, ...sharedfood, ...sharedhealth, ...sharedpro, ...pro, ...proclients, ...proprofile, ...procalendar, ...promessages, ...prolibrary, ...pronutrition, ...proforms, ...proinsights, ...provitals, ...procourses, ...pronetwork, ...promarket, ...premium, ...premium2, ...premium3, ...premium4, ...premium5, ...web, ...webclienthealth };

export default ar;

// The legal pages' Arabic (whole modules with the English files' shape), read
// through documentFor() in i18n/core.
export { documents } from "./documents";

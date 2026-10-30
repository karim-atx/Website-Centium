import type { Catalogue } from "../core";
import core from "./core";

// Round F (AV): the Arabic catalogue, one file per area, loaded as one lazy
// chunk when Arabic is chosen. Every entry is in design-handover/round-f/
// ARABIC_REVIEW.md for Karim's review before merge.
const ar: Catalogue = { ...core };

export default ar;

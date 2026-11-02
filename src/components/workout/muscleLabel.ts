import { t, tx } from "../../i18n/core";

/** A muscle group's label in the app's language ("Back" the muscle is keyed apart from the Back button). */
export const muscleLabel = (label: string) => (label === "Back" ? tx("Back", "muscle") : t(label));

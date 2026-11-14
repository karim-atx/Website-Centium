import { t } from "../../i18n/core";

// Batch D GH: a custom movement may share its name with a library one (it is
// never blocked), and the two are different movements with separate records.
// Wherever both could appear (pickers, the records lists, history) the custom
// one reads "{name} (custom)". Pure (exerciseNames.test.ts).

const norm = (name: string) => name.trim().toLowerCase();

/** The library's names, normalised, for nameClash. */
export const libraryNameSet = (catalog: readonly { name: string }[]): ReadonlySet<string> => new Set(catalog.map((e) => norm(e.name)));

/** A custom movement whose name is also a library movement's. */
export const nameClash = (name: string, isCustom: boolean, libraryNames: ReadonlySet<string>): boolean => isCustom && libraryNames.has(norm(name));

/** The name as shown: "Bench Press (custom)" for a clashing custom movement, else the name. */
export const shownExerciseName = (name: string, isCustom: boolean, libraryNames: ReadonlySet<string>): string =>
  nameClash(name, isCustom, libraryNames) ? t("{name} (custom)", { name }) : name;

/** Whether a name is used by both a library and a custom movement (an id-less legacy row can't be told apart then). */
export const nameShared = (name: string, catalog: readonly { name: string }[], custom: readonly { name: string }[]): boolean =>
  catalog.some((e) => norm(e.name) === norm(name)) && custom.some((e) => norm(e.name) === norm(name));

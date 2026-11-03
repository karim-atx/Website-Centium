import { createContext } from "react";

// Website viewport v1 · WB-AN.3 Members (list-detail): a section page shown
// inside the web detail pane, under the pane's own header. True there, the
// mobile back header (AnHeaderRow) is left out; false (the default, and every
// mobile screen) changes nothing.
export const AnEmbedded = createContext(false);

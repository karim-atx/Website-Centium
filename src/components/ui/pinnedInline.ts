import React from "react";

/**
 * Website viewport (Addendum A): a web page that draws the pinned content in
 * a panel of its own (the class page's booking panel, the offer's cost
 * panel) sets this; PinnedSlot then renders its children in place. False
 * everywhere else, so the slot is pinned as before.
 */
export const PinnedInline = React.createContext(false);

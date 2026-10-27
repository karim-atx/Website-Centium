// Centium landing v29: the viewport width and height as React state, for the
// marketing pages whose responsive values (the prototype's `r`) depend on
// them (Contact, Legal, 404). Re-renders on resize.

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getVw = () => window.innerWidth;
const getVh = () => window.innerHeight;

export const useViewportWidth = () => useSyncExternalStore(subscribe, getVw, getVw);
export const useViewportHeight = () => useSyncExternalStore(subscribe, getVh, getVh);

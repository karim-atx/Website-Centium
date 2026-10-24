// Centium landing v29: runs the loading sequence a marketing page load gets
// (prototype `initLoading` + `end`). Mounted by MarketingLayout after <main>,
// keyed by the path, so every page decides afresh (only the
// first route of a document can get a loader: see pickLoader.ts).

import React, { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { reducedMotion } from "../engine/env";
import { clearLoadingTasks, landingState, loadingTasksFor } from "../state";
import { consumeLoaderEntry, loaderEntryFor, markVisited } from "./pickLoader";
import { fontTask, runLoader } from "./loader";
import { Lo1, Lo2 } from "./Loaders";
import { titleIn, titleLift } from "./title";

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getVw = () => window.innerWidth;

const RouteLoader: React.FC = () => {
  const location = useLocation();
  const [entry] = useState(() => loaderEntryFor(location.key, location.pathname, location.hash));
  const [on, setOn] = useState(entry.kind != null);
  const vw = useSyncExternalStore(subscribeResize, getVw, getVw);

  useLayoutEffect(() => {
    const key = location.key;
    if (!entry.kind) {
      // No loader (back/forward, later pages of the visit): loading counts as
      // done, and the visit flags are still set (prototype initLoading).
      landingState.set({ loaded: true, lo1Done: true });
      markVisited();
      consumeLoaderEntry(key);
      clearLoadingTasks(key);
      landingState.requestScrollPass();
      return;
    }
    landingState.set({ loaded: false, lo1Done: entry.kind !== "lo1" });
    // The navbar logo hides while a loader runs (prototype navLogoOp).
    const navLogo = document.getElementById("nav-logo");
    if (navLogo) navLogo.style.opacity = "0";
    const tasks = [fontTask("800 78px Manrope"), fontTask("700 13px Manrope"), ...loadingTasksFor(key)];
    const run = runLoader(entry, tasks, () => {
      // Prototype `end`.
      const rm = entry.mode === "rm" || reducedMotion();
      landingState.set({ loaded: true, lo1Done: true });
      titleIn(1, rm);
      titleLift(1, rm);
      const nl = document.getElementById("nav-logo");
      if (nl) nl.style.opacity = "";
      const dt = document.getElementById("i-dot");
      if (dt) dt.style.opacity = "1";
      setOn(false);
      markVisited();
      consumeLoaderEntry(key);
      clearLoadingTasks(key);
      landingState.requestScrollPass();
    });
    return () => run.cancel();
    // The entry is fixed for the life of this keyed component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!on) return null;
  return entry.kind === "lo1" ? <Lo1 vw={vw} /> : <Lo2 vw={vw} />;
};

export const LoadingHost: React.FC = () => {
  const location = useLocation();
  // Keyed by path, not by location key: a same-page hash change must not cut a running loader short.
  return <RouteLoader key={location.pathname} />;
};

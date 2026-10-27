import React, { createElement, use } from "react";

// The web app's pages (appPages.ts) as a separate chunk.
//
// WHY: the landing at / used to import every app page statically, so its
// first paint waited for one 7.3 MB (2.1 MB gzipped) chunk holding the whole
// app. Lighthouse's slow-4G mobile profile put FCP at ~13 s, almost all of it
// that download. The marketing pages stay in the entry; everything an app
// route renders comes from here.
//
// HOW IT KEEPS THE APP'S BEHAVIOUR:
// - `appPages.X` is a stand-in component with X's props. Until the chunk is
//   in, it suspends (React's `use` on one cached promise) and App.tsx's
//   Suspense shows the app's own RouteLoading screen, the same "Loading…"
//   the route guards show while the session settles. Once loaded, every
//   stand-in renders its page synchronously, so moving between app pages
//   never suspends again.
// - The guarded app routes wait for the chunk under a boundary of their own
//   (App.tsx AppGate), so a click from the landing to /app shows that same
//   "Loading…" at once rather than a frozen landing or a blank page.
// - main.tsx starts the download before the first render on an app address,
//   so it runs alongside the session check instead of after it, and on the
//   marketing site as soon as a pointer or focus reaches a link into /app.

type AppPages = typeof import("./appPages");

let loaded: AppPages | null = null;
let loading: Promise<AppPages> | null = null;

/** Addresses App.tsx serves from appPages (the app and its public pages). */
const APP_ADDRESS = /^\/(app|calls|certificate|i|p|s|b)(\/|$)/;

// A failed chunk load is almost always a deploy that replaced the hashed file
// under an open tab: a full load of the same address fetches the new build.
// Only on an app address (a landing preload that fails simply tries again on
// the next render), and once per tab session, so a network that is really
// down still shows its error instead of reloading forever.
const RELOAD_KEY = "centium:app-chunk-reload";

export function loadAppPages(): Promise<AppPages> {
  loading ??= import("./appPages").then(
    (m) => {
      loaded = m;
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* storage unavailable */
      }
      return m;
    },
    (err: unknown) => {
      loading = null;
      if (!APP_ADDRESS.test(window.location.pathname)) throw err;
      let retried = true;
      try {
        retried = sessionStorage.getItem(RELOAD_KEY) === "1";
        if (!retried) sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        /* storage unavailable: do not risk a reload loop */
      }
      if (!retried) window.location.reload();
      throw err;
    },
  );
  return loading;
}

const standIns = new Map<string, React.ComponentType<object>>();

function standIn(name: keyof AppPages): React.ComponentType<object> {
  let C = standIns.get(name);
  if (!C) {
    const Page: React.FC<object> = (props) => {
      const pages = loaded ?? use(loadAppPages());
      const Real = pages[name] as React.ComponentType<object>;
      return createElement(Real, props);
    };
    Page.displayName = `AppPage(${name})`;
    C = Page;
    standIns.set(name, C);
  }
  return C;
}

/** Every export of appPages.ts, typed as itself; each one loads the chunk on first render. */
export const appPages = new Proxy({} as AppPages, {
  get: (_, name) => (typeof name === "string" ? standIn(name as keyof AppPages) : undefined),
});

const INTENT = ["pointerover", "pointerdown", "focusin"] as const;

/** Start the app chunk early: now on an app address, else on the first sign of a trip into /app. */
export function preloadAppPages(): void {
  if (APP_ADDRESS.test(window.location.pathname)) {
    void loadAppPages().catch(() => {});
    return;
  }
  const intent = (e: Event) => {
    const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!a || !APP_ADDRESS.test(new URL((a as HTMLAnchorElement).href, window.location.href).pathname)) return;
    for (const type of INTENT) document.removeEventListener(type, intent, true);
    void loadAppPages().catch(() => {});
  };
  for (const type of INTENT) document.addEventListener(type, intent, { capture: true, passive: true });
}

/** Renders its children once the app chunk is in (suspending until then). */
export const AppPagesReady = ({ children }: { children: React.ReactNode }): React.ReactNode => {
  if (!loaded) use(loadAppPages());
  return children;
};

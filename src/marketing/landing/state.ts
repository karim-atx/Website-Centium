// Centium landing v29: the little shared state between the eager shell (Nav,
// loading LO1/LO2, MarketingLayout) and the code-split motion engine. The
// prototype keeps these on one component (`this.loaded`, `state.spy`,
// `this.navVis`, `state.menuOpen`); here they live in one tiny store so the
// lazy chunk never has to reach into React.

type Listener = () => void;

export interface LandingState {
  /** Loading has ended (prototype `this.loaded`). True when no loader runs. */
  loaded: boolean;
  /** LO1 has finished, so the scroll engine may move the i-dot (prototype `this.lo1Done`). */
  lo1Done: boolean;
  /** Scroll-spy section id for the nav: platform | pricing | faq | null. */
  spy: string | null;
  /** Mobile menu open. */
  menuOpen: boolean;
  /** Bumped when the motion engine should re-run its scroll pass (prototype `this.onScroll()` calls from outside). */
  pulse: number;
}

let state: LandingState = { loaded: true, lo1Done: true, spy: null, menuOpen: false, pulse: 0 };
const listeners = new Set<Listener>();

export const landingState = {
  get: (): LandingState => state,
  set(patch: Partial<LandingState>) {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof LandingState)[]) {
      if (state[k] !== patch[k]) changed = true;
    }
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Ask the engine for a scroll pass (after loading ends, after a menu closes, ...). */
  requestScrollPass() {
    landingState.set({ pulse: state.pulse + 1 });
  },
};

const loadingTasks = new Map<string, Promise<unknown>[]>();

/** A page adds the real-progress work its loader should wait for (eager
 *  images, code-split chunks), under its router location key, from a layout
 *  effect: those run before the loading host's (it sits after <main>). */
export function addLoadingTask(locationKey: string, task: Promise<unknown>) {
  const list = loadingTasks.get(locationKey) ?? [];
  list.push(task);
  loadingTasks.set(locationKey, list);
}

export function loadingTasksFor(locationKey: string): Promise<unknown>[] {
  return loadingTasks.get(locationKey) ?? [];
}

export function clearLoadingTasks(locationKey: string) {
  loadingTasks.delete(locationKey);
}

/** When the nav last set the spy itself (prototype `this.spyClick`): the scroll
 *  spy leaves the clicked item alone for 900 ms while the smooth scroll travels. */
export const spyClick = { at: 0 };

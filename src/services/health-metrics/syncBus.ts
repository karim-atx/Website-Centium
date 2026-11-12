// "A wearable sync finished", so everything showing health data reads again
// (Karim, 2026-11-12: the cards must show synced data). platform/health.ts
// calls healthSynced() when a sync resolves (Sync now and the automatic one
// on opening the app), and when the app comes back to the front, since a
// background sync on the phone never calls into the page. AppContext listens
// and reloads metrics, sleep nights and workouts. Nothing listens in a browser.
const listeners = new Set<() => void>();

export function healthSynced(): void {
  for (const l of listeners) l();
}

export function onHealthSynced(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

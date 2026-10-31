import { tk } from "../../i18n/core";

/**
 * What the error boundary says about a render error (Round D O1, D-S19).
 *
 * "connection" when the browser reports offline, or the error is a code chunk
 * (map, call screen, the app pages) or a request that never reached the
 * server: the part needs a connection, and Retry can fix it. Anything else is
 * a real crash. isOffline() from network-error.ts is NOT used here: it treats
 * every TypeError as a dropped connection, which is right for a supabase-js
 * reply but would call "Cannot read properties of undefined" a network fault.
 */
export type ErrorPanelKind = "connection" | "crash";

const CHUNK_FAILURE =
  /dynamically imported module|importing a module script failed|loading (css )?chunk|chunkloaderror|unable to preload css/i;
const FETCH_FAILURE = /failed to fetch|networkerror|load failed|network request failed/i;

function messageOf(error: unknown): string {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return typeof error === "string" ? error : "";
}

/** A dynamic import that failed to download (a missing or unreachable chunk). */
export function isChunkLoadError(error: unknown): boolean {
  return CHUNK_FAILURE.test(messageOf(error));
}

export function errorPanelKind(error: unknown, online: boolean): ErrorPanelKind {
  if (!online) return "connection";
  const message = messageOf(error);
  return CHUNK_FAILURE.test(message) || FETCH_FAILURE.test(message) ? "connection" : "crash";
}

/** English keys (tk); the panel shows them through t(). */
export const ERROR_PANEL_COPY: Record<ErrorPanelKind, { title: string; line: string; action: string }> = {
  connection: { title: tk("This needs a connection"), line: tk("Check your connection and try again"), action: tk("Retry") },
  crash: { title: tk("Something went wrong"), line: "", action: tk("Try again") },
};

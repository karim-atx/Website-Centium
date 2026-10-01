import { createContext, useContext } from "react";

// The value ThreadLiveProvider shares; kept apart so that file exports only a
// component.

export interface ThreadLive {
  /** Chats where somebody else is online right now (mutual, server-gated). */
  online: Set<string>;
  /** Chats where somebody else is typing right now. */
  typing: Set<string>;
  /** Who is typing, by chat (the latest), so a group can say "Lina is typing". */
  typingBy: Record<string, string>;
  /** Call on each keystroke in a chat's composer; throttled here. */
  sendTyping: (threadId: string) => void;
  /** Rejoin every channel, e.g. after "Show when I'm online" changes. */
  reconnect: () => void;
}

export const empty = new Set<string>();
export const ThreadLiveCtx = createContext<ThreadLive>({ online: empty, typing: empty, typingBy: {}, sendTyping: () => {}, reconnect: () => {} });

export const useThreadLive = () => useContext(ThreadLiveCtx);

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase/client";
import { empty, ThreadLiveCtx } from "./threadLive";

/**
 * Typing and online status for the chats on screen (Database 20261002110000 and
 * 20261002120000).
 *
 * ONE PRIVATE CHANNEL PER CHAT, topic "thread:<id>", and the DATABASE decides
 * who may be on it. Realtime runs the policies on realtime.messages as this
 * user before letting them in:
 *
 *   typing    both in the chat, no block, nobody under 18, working together now
 *   presence  all of that, AND both people have "Show when I'm online" on
 *
 * So nothing here filters anything. If a signal arrives it was allowed; if the
 * server refuses one (a minor, a former client, presence not shared both ways)
 * it simply never arrives and the UI shows nothing. The client cannot show an
 * online dot the server would not have sent.
 *
 * SCOPED TO THE MESSAGES PAGE, deliberately: you appear online to the people you
 * share it with while you have Messages open and the tab is visible, not all
 * the time the app is open. That keeps one channel per chat to the screen that
 * uses them, rather than a socket per conversation for as long as anyone is
 * logged in.
 *
 * Sending "typing" is throttled to one ping every TYPING_SEND_MS per chat and
 * shown for TYPING_SHOW_MS after the last ping, so a pause reads as stopped.
 */

const TYPING_SEND_MS = 2500;
const TYPING_SHOW_MS = 5000;

export const ThreadLiveProvider: React.FC<{
  userId: string | null;
  threadIds: string[];
  children: React.ReactNode;
}> = ({ userId, threadIds, children }) => {
  const [online, setOnline] = useState<Set<string>>(empty);
  const [typingUntil, setTypingUntil] = useState<Record<string, number>>({});
  const [typingBy, setTypingBy] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const [epoch, setEpoch] = useState(0);
  const channels = useRef<Map<string, RealtimeChannel>>(new Map());
  const lastSent = useRef<Record<string, number>>({});
  const key = [...threadIds].sort().join(",");

  useEffect(() => {
    if (!userId || !key) return;
    let cancelled = false;
    const ids = key.split(",");
    const made = new Map<string, RealtimeChannel>();
    const refused = new Set<string>();

    const setOnlineFor = (id: string, isOnline: boolean) =>
      setOnline((prev) => {
        if (prev.has(id) === isOnline) return prev;
        const next = new Set(prev);
        if (isOnline) next.add(id);
        else next.delete(id);
        return next;
      });

    void (async () => {
      // Private channels authorise with the user's token, so hand it over first.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      for (const id of ids) {
        const ch = supabase.channel(`thread:${id}`, {
          config: { private: true, broadcast: { self: false }, presence: { key: userId } },
        });
        ch.on("broadcast", { event: "typing" }, ({ payload }) => {
          const who = (payload as { userId?: string } | undefined)?.userId;
          if (who === userId) return;
          setTypingUntil((prev) => ({ ...prev, [id]: Date.now() + TYPING_SHOW_MS }));
          if (who) setTypingBy((prev) => ({ ...prev, [id]: who }));
        });
        ch.on("presence", { event: "sync" }, () => {
          const others = Object.keys(ch.presenceState()).filter((k) => k !== userId);
          setOnlineFor(id, others.length > 0);
        });
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED" && document.visibilityState === "visible") {
            // Refused (and harmless) unless both people share presence.
            void ch.track({ at: Date.now() }).catch(() => {});
          }
          if (status === "CHANNEL_ERROR" || status === "CLOSED") setOnlineFor(id, false);
          // REFUSED IS NOT TRANSIENT. The library retries an errored channel
          // every few seconds for ever; a chat the database will never allow
          // (no live engagement, a block, someone under 18) is asked once and
          // then left alone until the list changes or the setting does.
          if (status === "CHANNEL_ERROR" && !refused.has(id)) {
            refused.add(id);
            void supabase.rpc("may_use_thread_channel", { p_topic: `thread:${id}` }).then(({ data, error }) => {
              if (cancelled) return;
              if (!error && data === false) {
                made.delete(id);
                void supabase.removeChannel(ch);
              } else {
                refused.delete(id);
              }
            });
          }
        });
        made.set(id, ch);
      }
      channels.current = made;
    })();

    // Hidden tab: not online. Visible again: online.
    const onVisibility = () => {
      for (const ch of made.values()) {
        if (document.visibilityState === "visible") void ch.track({ at: Date.now() }).catch(() => {});
        else void ch.untrack().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      for (const ch of made.values()) void supabase.removeChannel(ch);
      channels.current = new Map();
      setOnline(empty);
      setTypingUntil({});
    };
  }, [userId, key, epoch]);

  // Expire typing indicators; the timer only runs while one is showing.
  const anyTyping = Object.values(typingUntil).some((t) => t > now);
  useEffect(() => {
    if (!anyTyping) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [anyTyping]);

  const sendTyping = useCallback(
    (threadId: string) => {
      const ch = channels.current.get(threadId);
      if (!ch || !userId) return;
      const t = Date.now();
      if (t - (lastSent.current[threadId] ?? 0) < TYPING_SEND_MS) return;
      lastSent.current[threadId] = t;
      void ch.send({ type: "broadcast", event: "typing", payload: { userId } }).catch(() => {});
    },
    [userId]
  );

  const reconnect = useCallback(() => setEpoch((e) => e + 1), []);

  const typing = new Set(Object.entries(typingUntil).filter(([, until]) => until > now).map(([id]) => id));

  return <ThreadLiveCtx.Provider value={{ online, typing, typingBy, sendTyping, reconnect }}>{children}</ThreadLiveCtx.Provider>;
};

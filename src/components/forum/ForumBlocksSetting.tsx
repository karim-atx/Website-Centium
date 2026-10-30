import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, UserX } from "lucide-react";
import { SettingsRow } from "../ui/SettingsRows";
import { CentredPopup } from "../ui/CentredPopup";
import { Toast } from "../ui/Toast";
import { useApp } from "../../context/AppContext";
import { fetchMyForumBlocks, unblockForumBlock, type ForumBlock } from "../../services/forum";
import { forumAccess } from "../../services/forum/rules";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { linePx, textPx } from "../../theme/textSize";
import { appLocale } from "../../i18n/format";
import { t, tk } from "../../i18n/core";

// Settings › Data & account › "Blocked members" (MO1.8 BM, MO1.8.12,
// MO1.8.12.1, MO1.8.12.e): a Part B centred popup (X-01: 350 / r24 / pad 20 /
// Done 46) listing the people blocked from a forum post, each shown by the
// label that was on the post when they were blocked (a nickname or a first
// name) and nothing else. The app never holds who is behind a label:
// my_forum_blocks returns a reference, the label and the date, and
// unblock_forum_block takes the reference (K2, privacy). So there is no photo
// (V6-149): an initial-letter avatar stands in.
//
// Unblock asks first (MO1.8.12.1, a second popup stacked over the list).
// A forum block is the same user_blocks row messaging uses, so it also stops
// messages; the line says so (V6-34). Blocks made in Messages are listed
// there, not here (they have no forum label; V6-149).
//
// Visible only to adults, never to businesses (K14 / K5). Read fresh on every
// opening: a block made a minute ago belongs here (K1).

const LINE = tk("They can't message you, reply to you or see your posts in the forum.");
const UNBLOCK_LINE = tk("They'll be able to message you, reply to you and see your posts in the forum again.");
const EMPTY = tk("You haven't blocked anyone.");

/** "Blocked Sep 12", with the year when it isn't this year, in the profile's zone. */
function blockedOn(iso: string, zone: string | null): string {
  const d = new Date(iso);
  const tz = zone ?? undefined;
  const year = (x: Date) => new Intl.DateTimeFormat(appLocale("en-US"), { year: "numeric", timeZone: tz }).format(x);
  const sameYear = year(d) === year(new Date());
  const text = new Intl.DateTimeFormat(appLocale("en-US"), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: tz,
  }).format(d);
  return t("Blocked {date}", { date: text.replace(/Sept/, "Sep") });
}

function initial(label: string): string {
  const ch = [...label.trim()][0] ?? "";
  return /\p{L}/u.test(ch) ? ch.toUpperCase() : "?";
}

type Load = { state: "loading" } | { state: "error"; offline: boolean } | { state: "ready"; blocks: ForumBlock[] };

export function ForumBlocksSetting() {
  const { user, authUserId, myTimezone, accessibility } = useApp();
  const shown = user.accountType !== "business" && forumAccess(user.dateOfBirth) === "adult" && !!authUserId;
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [confirm, setConfirm] = useState<ForumBlock | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const reads = useRef(0);

  // MO1.8.12.1 O9: the confirm opens with focus on Cancel. Runs after
  // CentredPopup's own effect (a parent's effects run after its children's).
  useEffect(() => {
    if (confirm) cancelRef.current?.focus();
  }, [confirm]);

  if (!shown) return null;

  const read = () => {
    const n = ++reads.current;
    setLoad({ state: "loading" });
    void fetchMyForumBlocks().then((r) => {
      if (n !== reads.current) return;
      if (r.ok) setLoad({ state: "ready", blocks: r.value });
      else setLoad({ state: "error", offline: r.message === OFFLINE_MESSAGE });
    });
  };

  const openList = () => {
    setAnnounce("");
    setOpen(true);
    read();
  };

  const unblock = async (block: ForumBlock) => {
    setBusy(true);
    const r = await unblockForumBlock(block.ref);
    setBusy(false);
    setConfirm(null);
    if (!r.ok) {
      setToast(r.message === OFFLINE_MESSAGE ? t("You're offline. Try again when you're connected.") : t("Couldn't unblock. Try again."));
      return;
    }
    setLoad((prev) => {
      if (prev.state !== "ready") return prev;
      const blocks = prev.blocks.filter((b) => b.ref !== block.ref);
      if (blocks.length === 0) setAnnounce(t(EMPTY));
      return { state: "ready", blocks };
    });
  };

  const zone = myTimezone?.timezone ?? null;
  const lineStyle = (size: number, line: number) => ({ fontSize: textPx(size), lineHeight: linePx(line) });

  let content: React.ReactNode;
  if (load.state === "loading") {
    content = (
      <ul aria-busy aria-label={t("Loading")} style={{ marginTop: -6 }}>
        {[0, 1].map((i) => (
          <li key={i} className="flex items-center gap-[11px] py-2.5 [&+&]:border-t-[0.5px] [&+&]:border-hair-08">
            <span className="w-[38px] h-[38px] rounded-full bg-cream-soft animate-skeleton-pulse shrink-0" />
            <span className="flex flex-col gap-1.5">
              <span className="block w-[120px] h-3 rounded-md bg-cream-soft animate-skeleton-pulse" />
              <span className="block w-20 h-2.5 rounded-md bg-cream-soft animate-skeleton-pulse" />
            </span>
          </li>
        ))}
      </ul>
    );
  } else if (load.state === "error") {
    content = (
      <div className="text-center py-2">
        <p className="text-charcoal-soft" style={lineStyle(12.5, 18.8)}>
          {load.offline ? t("You're offline. Connect to see who you've blocked.") : t("Couldn't load blocked members.")}
        </p>
        <button type="button" onClick={read} className="tap mt-1 font-bold text-primary-dark" style={lineStyle(12.5, 18.8)}>
          {t("Retry")}
        </button>
      </div>
    );
  } else if (load.blocks.length === 0) {
    // MO1.8.12.e: a 44 tile 26 under the line, the text 8 under it, Done 22 under that.
    content = (
      <div className="flex flex-col items-center text-center">
        <span aria-hidden className="mt-2.5 w-11 h-11 rounded-[14px] bg-primary-pale text-primary-dark flex items-center justify-center">
          <UserX size={accessibility.largerText ? 25.3 : 22} strokeWidth={1.75} />
        </span>
        <p className="mt-2 mb-2.5 font-semibold text-charcoal-soft" style={lineStyle(13.5, 20.3)}>
          {t(EMPTY)}
        </p>
      </div>
    );
  } else {
    content = (
      <ul className="overflow-y-auto overscroll-contain" style={{ marginTop: -6, maxHeight: "calc(100dvh - 96px - 176px)" }}>
        {load.blocks.map((b) => (
          <li key={b.ref} className="flex items-center gap-[11px] py-2.5 [&+&]:border-t-[0.5px] [&+&]:border-hair-08">
            <span
              aria-hidden
              className="w-[38px] h-[38px] rounded-full bg-primary-pale text-primary-dark flex items-center justify-center shrink-0 font-bold"
              style={{ fontSize: textPx(14) }}
            >
              {initial(b.label)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate font-semibold text-charcoal" title={b.label} style={lineStyle(13.5, 20.3)}>
                {b.label}
              </span>
              <span className="block mt-px text-charcoal-faint" style={lineStyle(11, 16.5)}>
                {blockedOn(b.blockedAt, zone)}
              </span>
            </span>
            <button
              type="button"
              aria-label={t("Unblock {name}", { name: b.label })}
              onClick={() => setConfirm(b)}
              className="tap shrink-0 h-8 px-3.5 rounded-full bg-cream-card border-[1.1px] border-primary [html.high-contrast_&]:border-primary-dark text-primary-dark font-bold"
              style={lineStyle(12, 18)}
            >
              {t("Unblock")}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <SettingsRow icon={UserX} iconTone="dark" title={t("Blocked members")} onClick={openList} />

      <CentredPopup
        open={open}
        onClose={() => setOpen(false)}
        title={t("Blocked members")}
        geometry="partB"
        align="start"
        describeBody
        body={
          <span className="block font-normal text-charcoal-soft" style={{ ...lineStyle(12, 17.4), marginTop: -2 }}>
            {t(LINE)}
          </span>
        }
        cta={{ label: t("Done"), onClick: () => setOpen(false) }}
      >
        {content}
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </CentredPopup>

      <CentredPopup
        open={confirm !== null}
        // O1: a tap on the scrim, Escape or Back does nothing while it runs.
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        title={confirm ? t("Unblock {name}?", { name: confirm.label }) : ""}
        geometry="partB"
        align="start"
        alert
        describeBody
        titleClass="text-[17px] leading-[25.5px] tracking-[-0.3px] line-clamp-2 [overflow-wrap:anywhere]"
        body={
          <span className="block font-normal text-charcoal-soft" style={lineStyle(12.5, 18.8)}>
            {t(UNBLOCK_LINE)}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={() => setConfirm(null)}
            className="tap h-[46px] rounded-[14px] bg-cream-card border-[0.5px] border-charcoal/[0.14] text-charcoal-soft font-bold disabled:opacity-60"
            style={lineStyle(14, 21)}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => confirm && void unblock(confirm)}
            className="tap h-[46px] rounded-[14px] bg-fill-pinned text-on-primary-fill font-bold flex items-center justify-center"
            style={lineStyle(14, 21)}
          >
            {busy ? <Loader2 size={18} aria-label={t("Unblocking")} className="animate-spin" /> : t("Unblock")}
          </button>
        </div>
      </CentredPopup>

      <Toast
        open={toast !== null}
        message={toast ?? ""}
        onExpire={() => setToast(null)}
        icon={<AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />}
      />
    </>
  );
}

import { useEffect, useState } from "react";
import { fetchReservedNicknames, setNickname } from "../../services/forum";
import { nicknameProblem, NICKNAME_PROBLEM_TEXT } from "../../services/forum/rules";
import { fv } from "./forumColor";
import { rememberNickname } from "./useForumMe";

import { AtSign, ChevronLeft } from "lucide-react";
import { PinnedCta } from "../ui/PinnedCta";
import { useBack } from "../../hooks/useBack";

// Design screen 4: "Choose a forum nickname". Shown on a member's first visit
// to the forum, and again from Profile or the forum's Edit link to change it.
//
// NO "AVAILABLE" LINE BEFORE SAVING. The design shows one, but the nickname
// table is readable only row by row by its owner, so the device cannot know a
// name is free until set_forum_nickname accepts it (ATX63 when it is taken).
// Showing "Available" for a name that then turns out taken would be wrong, so
// the screen checks what it can (format, reserved words, your own name) and
// lets the save answer the rest.

export function NicknameScreen({
  firstName,
  initial,
  editing,
  onDone,
}: {
  firstName: string;
  initial: string | null;
  editing: boolean;
  onDone: (nickname: string) => void;
}) {
  const back = useBack();
  const [value, setValue] = useState(initial ?? "");
  const [reserved, setReserved] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchReservedNicknames().then((r) => live && setReserved(r));
    return () => {
      live = false;
    };
  }, []);

  const problem = nicknameProblem(value, reserved, [firstName]);
  const unchanged = editing && initial !== null && value.trim() === initial;
  const shownError = serverError ?? (touched && problem ? NICKNAME_PROBLEM_TEXT[problem] : null);

  const submit = async () => {
    setTouched(true);
    if (problem || busy) return;
    if (unchanged) {
      onDone(initial!);
      return;
    }
    setBusy(true);
    setServerError(null);
    const r = await setNickname(value);
    setBusy(false);
    if (!r.ok) {
      setServerError(r.message);
      return;
    }
    rememberNickname(value.trim());
    onDone(value.trim());
  };

  // Mobile v5.1 MO1.3.4: a back chevron, the AtSign tile, a fixed "@" before
  // the field and a pinned button. Colours are the forum's own, as before.
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col"
      style={{ color: fv("text") }}
    >
      <div className="flex flex-col gap-4 pb-6">
        {/* Frame check (MO1.3.4): the back button at the content edge
            (chevron centre x 34), #5B5349 (new since R1); the AtSign tile 20
            under it. The tile existed before the redesign, so it keeps the
            forum tints in both modes (decision 22; the frame draws #F0EDF9 /
            #7D6BB5); the title on a 30 pt line. */}
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="mt-1 w-14 h-14 rounded-[18px] flex items-center justify-center" style={{ background: fv("rules-bg") }}>
          <AtSign size={26} strokeWidth={1.75} style={{ color: fv("rules-ink") }} />
        </div>
        <h1 className="m-0 text-[24px] font-extrabold leading-[1.25] [text-wrap:balance]">Choose a forum nickname</h1>
        <p className="m-0 text-[14px] leading-[1.6]" style={{ color: fv("body") }}>
          Each time you post, you choose whether to use this nickname or your first name. Nobody in the community can
          see who is behind your nickname.
        </p>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold" style={{ color: fv("muted") }}>
          Nickname
          {/* MO1.3.4 #5: 50 tall with a 1.5 pt accent border (measured from
              the frame, 2x: 100 px with a 3 px border). */}
          <span
            className="h-[50px] rounded-[14px] px-[14px] flex items-center gap-1"
            style={{ border: `1.5px solid ${fv("accent")}`, background: fv("card") }}
          >
            <span aria-hidden className="text-base font-bold" style={{ color: fv("muted") }}>@</span>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setServerError(null);
            }}
            onBlur={() => setTouched(true)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            aria-invalid={!!shownError}
            aria-describedby="nickname-rules"
            className="grow min-w-0 h-full bg-transparent text-base font-bold outline-none"
            style={{ color: fv("text") }}
          />
          </span>
        </label>
        {shownError && (
          <span role="alert" className="text-[13px] font-bold text-status-high">
            {shownError}
          </span>
        )}
        {/* Frame check: text at x 29 (13 in), 19 pt lines, 6 between rules. */}
        <ul id="nickname-rules" className="m-0 pl-[13px] text-[12.5px] leading-[19px] list-disc space-y-1.5" style={{ color: fv("body") }}>
          <li>3 to 20 letters, numbers or underscores</li>
          <li>Not your real name, and not a name that sounds official, like "Doctor" or "Support"</li>
          <li>You can change it later in Profile</li>
        </ul>
      </div>
      {/* The page's own padding covers 112 of the 172 a pinned button needs. */}
      <div aria-hidden style={{ height: 60 }} />
      <PinnedCta
        primary={{
          label: editing ? "Save" : "Continue",
          loading: busy,
          onClick: () => void submit(),
          // The button this replaces was the forum's accent with its ink.
          className: "!bg-[var(--forum-accent)] !text-[var(--forum-on-accent)]",
        }}
      />
    </form>
  );
}

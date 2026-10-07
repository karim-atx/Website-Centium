import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { DangerLine } from "./parts";
import { useNavigate } from "react-router-dom";
import { createThread, type Identity } from "../../services/forum";
import { composeChips, type ForumCategory } from "../../services/forum/rules";
import { fv } from "./forumColor";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { PopupMenu } from "../ui/PopupMenu";
import { categoryDot, orderCategories } from "./categoryColour";
import { useIsDark } from "../../hooks/useIsDark";

// Design screen 3: a new post, as mobile v5.1 MO1.3.2's lavender-header
// sheet over the forum (also what /app/forum/new opens). The category is a
// dropdown (MO1.3.2.1) that starts on General, and "Post to forum" stays
// disabled until the post is filled in (A22). Fields keep the forum's colours.
// Handover-complete pass (2026-10-07): the photo upload, its preview and its
// privacy line are removed (MO1.3.2 draws none); photos already on posts
// still show on the post page.
//
// "POST AS" IS FIXED ONCE POSTED. The server freezes a post's identity
// (ATX61), and the line under the choice says so. A professional has no
// choice: they post under their first name (ATX59), so the fieldset is not
// shown to them.

export function ForumCompose({
  userId,
  firstName,
  nickname,
  isProfessional,
  categories,
  recoveryOn,
  recoveryPending,
  onClose,
}: {
  onClose: () => void;
  userId: string;
  firstName: string;
  nickname: string | null;
  isProfessional: boolean;
  categories: ForumCategory[];
  recoveryOn: boolean;
  recoveryPending: boolean;
}) {
  const navigate = useNavigate();
  const dark = useIsDark();
  // General first (the default), then the design's order (A20, A22).
  const chips = useMemo(() => {
    const all = orderCategories(composeChips(categories, recoveryOn));
    return [...all.filter((c) => c.key === "general"), ...all.filter((c) => c.key !== "general")];
  }, [categories, recoveryOn]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [identity, setIdentity] = useState<Identity>(!isProfessional && nickname ? "nickname" : "real_name");
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  // Decision 23 (item 69): each error sits under the field it is about; a
  // refusal from the server under the Post field.
  const [error, setError] = useState<{ field: "title" | "body"; message: string } | null>(null);

  // Opens on General (the first); a choice recovery mode hides falls back to it too.
  const chosen = category && chips.some((c) => c.key === category) ? category : chips[0]?.key ?? null;

  const t = title.trim();
  const b = body.trim();
  const ready = !!chosen && !recoveryPending && t.length >= 3 && t.length <= 140 && b.length >= 1 && !busy;

  const post = async () => {
    if (!ready || !chosen) {
      if (t.length < 3) setError({ field: "title", message: "Give your post a title of at least 3 characters." });
      else if (!b) setError({ field: "body", message: "Write something in your post." });
      return;
    }
    setBusy(true);
    setError(null);
    const r = await createThread({
      userId,
      categoryKey: chosen,
      identity: isProfessional ? "real_name" : identity,
      title: t,
      body: b,
      photoPath: null,
    });
    setBusy(false);
    if (!r.ok) {
      setError({ field: "body", message: r.message });
      return;
    }
    navigate(r.value.held ? "/app/forum" : `/app/forum/post/${r.value.id}`, { replace: true });
  };

  // MO1.3.2: choice cards with a check circle (the radio stays, hidden, for
  // keyboards and screen readers).
  const choice = (value: Identity, name: string, hint: string) => {
    const on = identity === value;
    return (
      // Frame check (measured): 56 tall (padding 8 10), a 1.5 outline when
      // chosen; the card's pre-R1 colours stay (decision 22).
      <label
        className="flex-1 min-w-0 rounded-[14px] px-2.5 py-2 flex gap-2.5 items-center cursor-pointer"
        style={on ? { border: `1.5px solid ${fv("accent")}`, background: fv("rules-bg") } : { border: `1px solid ${fv("border")}`, margin: 0.5 }}
      >
        <input type="radio" name="forum-post-as" checked={on} onChange={() => setIdentity(value)} className="sr-only" />
        {/* The check circle is new since R1: the frame's 18 pt circle,
            #9A8CD6 when chosen, a 1.5 #CBCACA ring when not (light). */}
        <span
          aria-hidden
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
          style={
            on
              ? { background: dark ? fv("accent") : "rgb(var(--th-9a8cd6))", color: dark ? fv("on-accent") : "#FFFFFF" }
              : { border: `1.5px solid ${dark ? fv("border") : "#CBCACA"}`, background: fv("card") }
          }
        >
          {on && <Check size={11} strokeWidth={3} />}
        </span>
        {/* MO1.3.2 #12: name 13.5/700, hint 11/400, Check 11/3; no gap (measured). */}
        <span className="min-w-0 flex flex-col">
          <span className="text-[13.5px] font-bold truncate">{name}</span>
          <span className="text-[11px] font-normal" style={{ color: fv("muted") }}>
            {hint}
          </span>
        </span>
      </label>
    );
  };
  const chosenCat = chips.find((c) => c.key === chosen);

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="New Post"
      footer={<CtaButton label={busy ? "Posting…" : "Post to forum"} onClick={() => void post()} disabled={!ready} loading={busy} />}
    >
      {/* Frame check: 14 between the sections (measured), not 16. */}
      <div className="flex flex-col gap-3.5" style={{ color: fv("text") }}>
        {!isProfessional && nickname && (
          <fieldset className="border-none m-0 p-0 flex flex-col gap-1.5">
            <legend className="text-[12px] font-semibold p-0 mb-1.5" style={{ color: fv("muted") }}>
              Post as
            </legend>
            <div className="flex gap-2">
              {choice("nickname", nickname, "Your nickname")}
              {choice("real_name", firstName, "Your first name")}
            </div>
            <span className="text-[11px] font-normal leading-[1.5]" style={{ color: fv("muted") }}>
              Nobody can see who is behind your nickname. You can't change this after posting.
            </span>
          </fieldset>
        )}

        <div className="flex gap-2.5">
          {/* 35% (122 of 349, measured), the title field the rest. */}
          <div className="flex flex-col gap-1.5 w-[35%] shrink-0">
            <span className="text-[12px] font-semibold" style={{ color: fv("muted") }}>
              Category
            </span>
            {/* MO1.3.2: Category and Title 44 tall, Post 198 (measured from
                the frame, 2x). */}
            {recoveryPending ? (
              // KEEP-SAFETY (handover-complete pass): no category is offered
              // until the recovery setting is known, so a hidden one is never
              // shown first. Drawn as the field it stands in for (44, r12,
              // the field's border), pulsing.
              <div className="h-[44px] rounded-xl animate-pulse" aria-hidden="true" style={{ border: `1px solid ${fv("border")}`, background: fv("track") }} />
            ) : (
              <button
                ref={setAnchor}
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Category: ${chosenCat?.name ?? "none"}`}
                className="tap h-[44px] rounded-xl px-3 flex items-center gap-2 text-sm font-semibold"
                style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
              >
                {chosenCat && <span aria-hidden className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: categoryDot(chosenCat.key) }} />}
                <span className="flex-1 min-w-0 text-left truncate">{chosenCat?.name ?? ""}</span>
                {/* MO1.3.2.1: ChevronUp 15 while the menu is open. */}
                {menuOpen ? (
                  <ChevronUp size={15} className="shrink-0" style={{ color: fv("muted") }} />
                ) : (
                  <ChevronDown size={15} className="shrink-0" style={{ color: fv("muted") }} />
                )}
              </button>
            )}
          </div>
          <label className="flex-1 min-w-0 flex flex-col gap-1.5 text-[12px] font-semibold" style={{ color: fv("muted") }}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="What's on your mind?"
              className="h-[44px] rounded-xl px-3 text-sm font-semibold outline-none"
              style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
            />
          </label>
        </div>
        {error?.field === "title" && <DangerLine className="-mt-2">{error.message}</DangerLine>}
        {/* MO1.3.2: the Post field 198 tall. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forum-compose-body" className="text-[12px] font-semibold" style={{ color: fv("muted") }}>
            Post
          </label>
          <textarea
            id="forum-compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
            placeholder="Share a win, ask a question, or pass on a tip…"
            className="h-[198px] rounded-xl px-3 py-2.5 text-sm font-normal resize-none outline-none"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          />
          {error?.field === "body" && <DangerLine>{error.message}</DangerLine>}
        </div>

        <span className="text-xs leading-[1.5]" style={{ color: fv("muted") }}>
          Posts with links are checked by a moderator before they appear.
        </span>
      </div>

      {/* MO1.3.2.1: the category dropdown, plain rows on a 178 pt card, over
          the sheet without a second dim. */}
      <PopupMenu<string>
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={anchor}
        align="left"
        variant="plain"
        backdrop={false}
        width={164}
        options={chips.map((c) => ({
          value: c.key,
          label: c.name,
          icon: <span className="block w-2 h-2 rounded-full" style={{ background: categoryDot(c.key) }} />,
        }))}
        selected={chosen}
        onSelect={(k) => setCategory(k)}
      />
    </BottomSheet>
  );
}

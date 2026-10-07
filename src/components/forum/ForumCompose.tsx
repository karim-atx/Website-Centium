import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, ImagePlus, X } from "lucide-react";
import { DangerLine } from "./parts";
import { useNavigate } from "react-router-dom";
import { createThread, uploadForumPhoto, type Identity } from "../../services/forum";
import { FORUM_PHOTO_ACCEPT, FORUM_PHOTOS_ENABLED, prepareForumPhoto } from "../../services/forum/photo";
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
// Restore round (user, 2026-10-07): the optional photo is back, as a small
// ImagePlus button at the Post field's bottom-left corner (inside the drawn
// 198 pt field); a chosen photo shows there as a thumbnail with a remove x,
// and the privacy line is the field's helper text while a photo is attached.
//
// "POST AS" IS FIXED ONCE POSTED. The server freezes a post's identity
// (ATX61), and the line under the choice says so. A professional has no
// choice: they post under their first name (ATX59), so the fieldset is not
// shown to them.
//
// ONE OPTIONAL PHOTO, re-drawn on the device so nothing of where or with what
// it was taken survives. If that fails the photo is refused, not sent as it
// was (services/forum/photo).

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Decision 23 (item 69): each error sits under the field it is about; a
  // refusal from the server (or the upload) under the Post field.
  const [error, setError] = useState<{ field: "title" | "body"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Opens on General (the first); a choice recovery mode hides falls back to it too.
  const chosen = category && chips.some((c) => c.key === category) ? category : chips[0]?.key ?? null;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setPreparing(true);
    const r = await prepareForumPhoto(file);
    setPreparing(false);
    if (!r.ok) {
      setPhotoError(r.message);
      return;
    }
    setPhoto(r.file);
    setPreview(URL.createObjectURL(r.file));
  };

  const removePhoto = () => {
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const t = title.trim();
  const b = body.trim();
  const ready = !!chosen && !recoveryPending && t.length >= 3 && t.length <= 140 && b.length >= 1 && !busy && !preparing;

  const post = async () => {
    if (!ready || !chosen) {
      if (t.length < 3) setError({ field: "title", message: "Give your post a title of at least 3 characters." });
      else if (!b) setError({ field: "body", message: "Write something in your post." });
      return;
    }
    setBusy(true);
    setError(null);
    let photoPath: string | null = null;
    if (photo) {
      const up = await uploadForumPhoto(photo);
      if (!up.ok) {
        setBusy(false);
        setError({ field: "body", message: up.message });
        return;
      }
      photoPath = up.value;
    }
    const r = await createThread({
      userId,
      categoryKey: chosen,
      identity: isProfessional ? "real_name" : identity,
      title: t,
      body: b,
      photoPath,
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
        {/* MO1.3.2: the Post field 198 tall. Restore round: the photo
            control sits inside it, a 44 pt row along its bottom edge with no
            rule, so the field keeps the drawn 198 and the sheet its height. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forum-compose-body" className="text-[12px] font-semibold" style={{ color: fv("muted") }}>
            Post
          </label>
          <div
            className="h-[198px] rounded-xl flex flex-col overflow-hidden"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card") }}
          >
            <textarea
              id="forum-compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              placeholder="Share a win, ask a question, or pass on a tip…"
              aria-describedby={FORUM_PHOTOS_ENABLED && photo ? "forum-compose-photo-note" : undefined}
              className="flex-1 min-h-0 px-3 pt-2.5 pb-1 text-sm font-normal resize-none outline-none bg-transparent"
              style={{ color: fv("text") }}
            />
            {FORUM_PHOTOS_ENABLED && (
              <div className="h-11 shrink-0 flex items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept={FORUM_PHOTO_ACCEPT}
                  className="hidden"
                  onChange={(e) => void pick(e.target.files?.[0])}
                />
                {preview ? (
                  // The chosen photo: a 32 pt thumbnail (r8) in the corner,
                  // its remove x a 16 pt badge on a 44 pt target.
                  <div className="relative ml-2 w-8 h-8 shrink-0">
                    <img src={preview} alt="The photo you're adding" className="w-8 h-8 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      aria-label="Remove photo"
                      className="tap absolute -top-3.5 -right-3.5 w-11 h-11 flex items-start justify-end p-1.5"
                    >
                      <span
                        aria-hidden
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: fv("text"), color: fv("card"), boxShadow: `0 0 0 1.5px ${fv("card")}` }}
                      >
                        <X size={10} strokeWidth={3} />
                      </span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={preparing}
                    aria-label={preparing ? "Preparing photo…" : "Add a photo (optional)"}
                    className="tap w-11 h-11 flex items-center justify-center shrink-0 disabled:opacity-60"
                    style={{ color: fv("link") }}
                  >
                    <ImagePlus size={18} strokeWidth={1.75} aria-hidden className={preparing ? "animate-pulse" : undefined} />
                  </button>
                )}
              </div>
            )}
          </div>
          {/* A22 privacy line: the field's helper text while a photo is attached (decision 23, item 253). */}
          {FORUM_PHOTOS_ENABLED && photo && (
            <span id="forum-compose-photo-note" className="text-[11px] font-normal leading-[1.5]" style={{ color: fv("muted") }}>
              Location and camera details are removed from photos before they're shared.
            </span>
          )}
          {photoError && <DangerLine>{photoError}</DangerLine>}
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

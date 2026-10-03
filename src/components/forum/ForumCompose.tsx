import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createThread, uploadForumPhoto, type Identity } from "../../services/forum";
import { FORUM_PHOTO_ACCEPT, FORUM_PHOTOS_ENABLED, prepareForumPhoto } from "../../services/forum/photo";
import { composeChips, type ForumCategory } from "../../services/forum/rules";
import { ForumChip } from "./parts";
import { fv } from "./forumColor";

// Design screen 3: a new post.
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
}: {
  userId: string;
  firstName: string;
  nickname: string | null;
  isProfessional: boolean;
  categories: ForumCategory[];
  recoveryOn: boolean;
  recoveryPending: boolean;
}) {
  const navigate = useNavigate();
  const chips = useMemo(() => composeChips(categories, recoveryOn), [categories, recoveryOn]);
  const [identity, setIdentity] = useState<Identity>(!isProfessional && nickname ? "nickname" : "real_name");
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The design opens on the first category selected; a choice recovery mode
  // hides falls back to it too.
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
      if (t.length < 3) setError("Give your post a title of at least 3 characters.");
      else if (!b) setError("Write something in your post.");
      return;
    }
    setBusy(true);
    setError(null);
    let photoPath: string | null = null;
    if (photo) {
      const up = await uploadForumPhoto(photo);
      if (!up.ok) {
        setBusy(false);
        setError(up.message);
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
      setError(r.message);
      return;
    }
    navigate(r.value.held ? "/app/forum" : `/app/forum/post/${r.value.id}`, { replace: true });
  };

  const choice = (value: Identity, name: string, hint: string) => {
    const on = identity === value;
    return (
      <label
        className="flex-1 min-w-0 rounded-[14px] px-3 py-2.5 flex flex-col gap-0.5 cursor-pointer"
        style={on ? { border: `2px solid ${fv("accent")}`, background: fv("rules-bg") } : { border: `1px solid ${fv("border")}`, margin: 1 }}
      >
        <span className="flex gap-1.5 items-center min-w-0">
          <input
            type="radio"
            name="forum-post-as"
            checked={on}
            onChange={() => setIdentity(value)}
            style={{ accentColor: fv("accent") }}
          />
          <span className="text-sm font-extrabold truncate">{name}</span>
        </span>
        <span className="text-xs" style={{ color: fv("muted") }}>
          {hint}
        </span>
      </label>
    );
  };

  return (
    <div className="flex flex-col" style={{ color: fv("text") }}>
      <div className="flex items-center justify-between pt-1 pb-2">
        <button
          type="button"
          onClick={() => navigate("/app/forum")}
          className="tap text-sm font-bold py-3 px-1"
          style={{ color: fv("link") }}
        >
          Cancel
        </button>
        <span className="text-base font-extrabold">New post</span>
        <button
          type="button"
          onClick={() => void post()}
          disabled={busy || preparing}
          className="tap h-11 rounded-full px-[18px] text-sm font-extrabold disabled:opacity-60"
          style={{ background: fv("accent"), color: fv("on-accent") }}
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>

      <div className="py-2 flex flex-col gap-4">
        {error && (
          <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        {!isProfessional && nickname && (
          <fieldset className="border-none m-0 p-0 flex flex-col gap-2">
            <legend className="text-[13px] font-extrabold p-0 mb-2">Post as</legend>
            <div className="flex gap-2">
              {choice("nickname", nickname, "Your nickname")}
              {choice("real_name", firstName, "Your first name")}
            </div>
            <span className="text-xs leading-[1.5]" style={{ color: fv("muted") }}>
              Nobody can see who is behind your nickname. You can't change this after posting.
            </span>
          </fieldset>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-extrabold">Category</span>
          {recoveryPending ? (
            <div className="flex gap-1.5 flex-wrap" aria-hidden="true">
              {[92, 80, 100].map((w, i) => (
                <div key={i} className="h-[34px] rounded-full animate-pulse" style={{ width: w, background: fv("track") }} />
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Category">
              {chips.map((c) => (
                <ForumChip key={c.key} active={chosen === c.key} onClick={() => setCategory(c.key)}>
                  {c.name}
                </ForumChip>
              ))}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-extrabold">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            className="h-[46px] rounded-xl px-3 text-sm font-semibold outline-none"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-extrabold">
          Post
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={8000}
            className="h-[140px] rounded-xl px-3 py-2.5 text-sm font-normal resize-none outline-none"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          />
        </label>

        {FORUM_PHOTOS_ENABLED && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={FORUM_PHOTO_ACCEPT}
              className="hidden"
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            {preview ? (
              <div className="flex flex-col gap-2">
                <img src={preview} alt="The photo you're adding" className="w-full max-h-[240px] object-cover rounded-[14px]" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="tap self-start text-[13px] font-bold py-2"
                  style={{ color: fv("link") }}
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={preparing}
                className="tap h-[52px] rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ border: `1px dashed ${fv("dashed")}`, background: fv("dashed-bg"), color: fv("rules-ink") }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="M21 17l-5-5-8 7" />
                </svg>
                {preparing ? "Preparing photo…" : "Add a photo (optional)"}
              </button>
            )}
            {photoError && (
              <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
                {photoError}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col gap-1.5 text-xs leading-[1.5]" style={{ color: fv("muted") }}>
          {FORUM_PHOTOS_ENABLED && <span>Location and camera details are removed from photos before they're shared.</span>}
          <span>Posts with links are checked by a moderator before they appear.</span>
        </div>
      </div>
    </div>
  );
}

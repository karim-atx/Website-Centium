import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { createThread, uploadForumPhoto, type Identity } from "../../../services/forum";
import { FORUM_PHOTO_ACCEPT, FORUM_PHOTOS_ENABLED, prepareForumPhoto } from "../../../services/forum/photo";
import { composeChips, type ForumCategory } from "../../../services/forum/rules";
import { mentionsSelfHarm } from "../../../services/moderation/phrases";
import { contactRefusal } from "../../../services/moderation/text";
import { orderCategories } from "../../../components/forum/categoryColour";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { GuidelinesLink } from "../../../components/moderation/GuidelinesLink";
import { t } from "../../../i18n/core";
import { coCategory, coDanger, coPrimary } from "./communityWebStyles";

const note = { margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" } as const;
const field = { borderRadius: 12, background: "#F5F5F6", padding: "12px 14px", boxSizing: "border-box", border: "none", outline: "none", color: "#241F1B", width: "100%" } as const;

/**
 * Website viewport v1, WC-CO.2 New post (WC-CO Community Web v3, "compose",
 * literal inside the shell's 440 side sheet: band #F0EEFD, "New Post" 20/800
 * #7248F8, the 26 X in a 1.6 ring, the white body r22 with 24 padding): the
 * categories as wrapping 38 chips (r12, 15/600, an 8 dot; 1px #E7E6E6, the
 * chosen one 1.5px #7D6BB5 on #F5F3FC), the title field (48, #F5F5F6 r12,
 * 17/700), the post field filling the rest (at least 120, 15/22), Add a photo
 * (15/700 #5F5093, Image 18), the two "Post as" buttons (44 r12 15/600; the
 * chosen #9A8CD6 white, the other #F5F4FE #5B5349) and Post (44 #9A8CD6, 0.4
 * until the post can go). Same rules as mobile: General is chosen first,
 * recovery mode hides its categories, a title of 3 to 140 and a body, contact
 * details refused here, one optional photo re-drawn on the device, a held
 * post goes back to the forum (or opens when it mentions self-harm).
 */
export function ForumComposeWeb({
  userId,
  firstName,
  nickname,
  categories,
  recoveryOn,
  recoveryPending,
  onClose,
}: {
  userId: string;
  firstName: string;
  nickname: string | null;
  categories: ForumCategory[];
  recoveryOn: boolean;
  recoveryPending: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const chips = useMemo(() => {
    const all = orderCategories(composeChips(categories, recoveryOn));
    return [...all.filter((c) => c.key === "general"), ...all.filter((c) => c.key !== "general")];
  }, [categories, recoveryOn]);
  const [identity, setIdentity] = useState<Identity>(nickname ? "nickname" : "real_name");
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "title" | "body"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const ttl = title.trim();
  const b = body.trim();
  const ready = !!chosen && !recoveryPending && ttl.length >= 3 && ttl.length <= 140 && b.length >= 1 && !busy && !preparing;

  const post = async () => {
    if (!ready || !chosen) {
      if (ttl.length < 3) setError({ field: "title", message: t("Give your post a title of at least 3 characters.") });
      else if (!b) setError({ field: "body", message: t("Write something in your post.") });
      return;
    }
    const contact = contactRefusal(ttl, b);
    if (contact) {
      setError({ field: "body", message: contact });
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
    const r = await createThread({ userId, categoryKey: chosen, identity, title: ttl, body: b, photoPath });
    setBusy(false);
    if (!r.ok) {
      setError({ field: "body", message: r.message });
      return;
    }
    const gentle = r.value.held && (await mentionsSelfHarm([ttl, b].join("\n")));
    navigate(r.value.held && !gentle ? "/app/forum" : `/app/forum/post/${r.value.id}`, { replace: true });
  };

  const danger = (m: string) => (
    <p role="alert" style={coDanger}>
      {m}
      <GuidelinesLink message={m} />
    </p>
  );

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={t("New Post")}
      footer={
        <button
          type="button"
          data-co-post
          onClick={() => void post()}
          aria-disabled={!ready}
          className="co-web-press w-full"
          style={{ ...coPrimary, opacity: ready || busy ? 1 : 0.4, gap: 8 }}
        >
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {busy ? t("Posting…") : t("Post")}
        </button>
      }
    >
      <div className="flex flex-col" style={{ gap: 16, minHeight: "100%", color: "#241F1B" }} data-co-compose>
        <div role="radiogroup" aria-label={t("Category")} className="flex flex-wrap" style={{ gap: 8 }}>
          {recoveryPending
            ? [0, 1, 2].map((i) => <span key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ width: 96, height: 38, borderRadius: 12 }} />)
            : chips.map((c) => {
                const on = c.key === chosen;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setCategory(c.key)}
                    className="co-web-focus flex items-center whitespace-nowrap"
                    style={{ height: 38, padding: "0 14px", borderRadius: 12, boxSizing: "border-box", gap: 6, fontSize: 15, fontWeight: 600, border: on ? "1.5px solid #7D6BB5" : "1px solid #E7E6E6", background: on ? "#F5F3FC" : "#FFFFFF", color: "#241F1B" }}
                  >
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: coCategory(c.key).dot }} />
                    {c.name}
                  </button>
                );
              })}
        </div>

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error?.field === "title") setError(null);
          }}
          maxLength={140}
          placeholder={t("What's on your mind?")}
          aria-label={t("Title")}
          className="placeholder:text-[#8C8378]"
          style={{ ...field, minHeight: 48, fontSize: 17, lineHeight: "24px", fontWeight: 700 }}
        />
        {error?.field === "title" && <div style={{ marginTop: -8 }}>{danger(error.message)}</div>}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={8000}
          placeholder={t("Share a win, ask a question, or pass on a tip…")}
          aria-label={t("Post")}
          aria-describedby={FORUM_PHOTOS_ENABLED && photo ? "co-compose-photo-note" : undefined}
          className="placeholder:text-[#8C8378]"
          style={{ ...field, flex: 1, minHeight: 120, resize: "none", fontSize: 15, lineHeight: "22px" }}
        />
        {error?.field === "body" && <div style={{ marginTop: -8 }}>{danger(error.message)}</div>}

        {FORUM_PHOTOS_ENABLED && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            <input ref={fileRef} type="file" accept={FORUM_PHOTO_ACCEPT} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
            {preview ? (
              <div className="flex items-center" style={{ gap: 10 }}>
                <img src={preview} alt={t("The photo you're adding")} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                <button type="button" onClick={removePhoto} className="co-web-focus flex items-center" style={{ gap: 6, fontSize: 15, fontWeight: 700, color: "#5F5093", borderRadius: 6 }}>
                  <X size={16} aria-hidden />
                  {t("Remove photo")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={preparing}
                className="co-web-focus self-start flex items-center"
                style={{ gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5F5093", borderRadius: 6, opacity: preparing ? 0.6 : 1 }}
              >
                <ImageIcon size={18} aria-hidden className={preparing ? "animate-pulse" : undefined} />
                {preparing ? t("Preparing photo…") : t("Add a photo")}
              </button>
            )}
            {photo && (
              <p id="co-compose-photo-note" style={note}>
                {t("Location and camera details are removed from photos before they're shared.")}
              </p>
            )}
            {photoError && danger(photoError)}
          </div>
        )}

        {nickname && (
          <div className="flex flex-col" style={{ gap: 6 }}>
            <div role="radiogroup" aria-label={t("Post as")} className="flex" style={{ gap: 8 }}>
              {(["nickname", "real_name"] as const).map((v) => {
                const on = identity === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setIdentity(v)}
                    className="co-web-focus truncate"
                    style={{ flex: 1, minWidth: 0, height: 44, padding: "0 12px", borderRadius: 12, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#9A8CD6" : "#F5F4FE", color: on ? "#FFFFFF" : "#5B5349" }}
                  >
                    {t("Post as {name}", { name: v === "nickname" ? nickname : firstName })}
                  </button>
                );
              })}
            </div>
            <p style={note}>{t("Nobody can see who is behind your nickname. You can't change this after posting.")}</p>
          </div>
        )}
        <p style={note}>{t("Posts with links are checked by a moderator before they appear. Photos are checked by our team first, usually within a day.")}</p>
      </div>
    </BottomSheet>
  );
}

import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { GroupAvatar } from "./GroupAvatar";
import { ImageApprovalBadge, ImageApprovalNote, useOwnImage } from "../moderation/ImageApproval";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_PHOTO_ACCEPT,
  renameGroup,
  setGroupDescription,
  submitGroupPhoto,
  withdrawGroupPhoto,
} from "../../services/messaging/groups";

/**
 * MO27 "Rename or edit description" (gen/r16.js groupInfo16's sheet), the
 * group owner's: the photo, the name and the description.
 *
 * Round D (Database 20261223040000 / 050000):
 * - PHOTO: goes through image approval (submit_image 'group_photo'). Until an
 *   admin approves it the owner sees the new one here with "Waiting for
 *   approval" (or the reason it was refused); members keep the previous photo,
 *   or none. A pending photo can be taken back; an approved one can't be
 *   removed from the app (photo_path is written by approval only).
 * - DESCRIPTION: set_group_description, up to 500, empty clears it; checked
 *   by the word lists (ATX60 refuses a blocked word, in our words).
 * Only what changed is sent; the name first, as before.
 */
export const GroupDetailsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  threadId: string;
  authUserId: string;
  name: string;
  description: string | null;
  photoPath: string | null;
  onChanged: () => void;
}> = ({ open, onClose, threadId, authUserId, name, description, photoPath, onChanged }) => {
  const [newName, setNewName] = useState(name);
  const [newDesc, setNewDesc] = useState(description ?? "");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const own = useOwnImage("group_photo", open ? threadId : null);

  // Each opening starts from what the group has now.
  useEffect(() => {
    if (!open) return;
    setNewName(name);
    setNewDesc(description ?? "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const nameChanged = newName.trim() !== name;
  const descChanged = newDesc.trim() !== (description ?? "").trim();
  const tooLong = newDesc.trim().length > GROUP_DESCRIPTION_MAX;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (nameChanged) {
      const r = await renameGroup(threadId, newName.trim());
      if (!r.ok) {
        setBusy(false);
        return setError(r.message);
      }
    }
    if (descChanged) {
      const r = await setGroupDescription(threadId, newDesc);
      if (!r.ok) {
        setBusy(false);
        onChanged();
        return setError(nameChanged ? `The name is saved. ${r.message}` : r.message);
      }
    }
    setBusy(false);
    onChanged();
    onClose();
  };

  const pick = async (file: File | undefined) => {
    if (!file || photoBusy) return;
    setPhotoBusy(true);
    setError(null);
    const r = await submitGroupPhoto(authUserId, threadId, file);
    setPhotoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) return setError(r.message);
    own.refresh();
  };

  const takeBack = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    setError(null);
    const r = await withdrawGroupPhoto(threadId);
    setPhotoBusy(false);
    if (!r.ok) return setError(r.message);
    own.refresh();
  };

  const pending = own.image?.status === "pending";
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rename or edit description"
      footer={<CtaButton className="w-full" size="sheet" label="Save" loading={busy} disabled={!newName.trim() || tooLong || (!nameChanged && !descChanged)} onClick={() => void save()} />}
    >
      <div className="flex items-center" style={{ gap: 14, marginBottom: 14 }}>
        {own.image?.url ? (
          <span className="rounded-full overflow-hidden shrink-0" style={{ width: 64, height: 64 }}>
            <img src={own.image.url} alt="" className="w-full h-full object-cover" />
          </span>
        ) : (
          <GroupAvatar path={photoPath} size={64} iconSize={26} />
        )}
        <div className="flex-1 min-w-0 flex flex-col items-start" style={{ gap: 6 }}>
          <ImageApprovalBadge state={own.image} />
          <div className="flex items-center flex-wrap" style={{ gap: 14 }}>
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
              className="tap disabled:opacity-60"
              style={{ minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}
            >
              {photoBusy ? "Sending…" : photoPath || own.image ? "Change photo" : "Add a photo"}
            </button>
            {pending && (
              <button type="button" disabled={photoBusy} onClick={() => void takeBack()} className="tap disabled:opacity-60" style={{ minHeight: 44, fontSize: textPx(13), fontWeight: 600, color: INK.hi }}>
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept={GROUP_PHOTO_ACCEPT} className="hidden" aria-label="Choose a group photo" onChange={(e) => void pick(e.target.files?.[0])} />
        </div>
      </div>
      <ImageApprovalNote state={own.image} className="mb-3" />
      {!own.image && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginBottom: 12 }}>Members see a new photo once our team approves it.</p>}

      <label htmlFor="grename" className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        Group name
      </label>
      <input id="grename" value={newName} maxLength={GROUP_NAME_MAX} onChange={(e) => setNewName(e.target.value)} style={FIELD} className="focus:outline-none focus:ring-2 focus:ring-primary/20" />
      <div className="flex items-center justify-between" style={{ gap: 8, margin: "14px 0 6px" }}>
        <label htmlFor="gredesc" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
          Description (optional)
        </label>
        <span className="tabular-nums" style={{ fontSize: textPx(11.5), color: tooLong ? INK.hi : INK.chF }}>
          {newDesc.trim().length}/{GROUP_DESCRIPTION_MAX}
        </span>
      </div>
      <textarea
        id="gredesc"
        value={newDesc}
        rows={3}
        maxLength={GROUP_DESCRIPTION_MAX + 50}
        onChange={(e) => setNewDesc(e.target.value)}
        placeholder="What the group is for"
        className="w-full rounded-[12px] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-charcoal-faint"
        style={{ fontSize: textPx(14), background: INK.soft, border: `1px solid ${INK.b10}`, color: INK.ch }}
      />
      <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>Everyone in the group sees it. Leave it empty to remove it.</p>
      {error && (
        <p role="alert" className="rounded-xl" style={{ fontSize: textPx(12), color: INK.hi, background: INK.hiBg, padding: "10px 14px", marginTop: 10 }}>
          {error}
        </p>
      )}
    </BottomSheet>
  );
};

const FIELD: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 12,
  background: INK.soft,
  border: `1px solid ${INK.b10}`,
  padding: "0 12px",
  fontSize: textPx(14),
  color: INK.ch,
};

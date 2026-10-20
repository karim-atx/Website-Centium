import React, { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { INK } from "../proInk";
import { ProCardSkeleton, ProError } from "../states";
import { Avatar } from "./kit";
import { fmtDay } from "./clientFormat";
import { fetchChangeHistory, type ChangeEntry } from "../../../services/pro/clientPage";
import { clock12 } from "../../../utils/time12";

/**
 * Release 3 · CL4 Change history (source gen/r6b.js auditSheet6): a
 * BottomSheet "Change history"; "Every change to {name}'s plans, sharing and
 * notes, newest first." 12.5 text.soft; rows pad 10 0 with 6% rules, avatar
 * 30 (the professional in teal), the change 13 / 600 / 1.4 and "{who} ·
 * {date} · {time}" 11 text.faint. Rows: pro_change_log (written by the
 * assign, plan and target functions) and the stage history (DB-3).
 */
export const ChangeHistorySheet: React.FC<{ open: boolean; onClose: () => void; clientId: string; firstName: string }> = ({ open, onClose, clientId, firstName }) => {
  const { authUserId, user } = useApp();
  const [rows, setRows] = useState<{ list: ChangeEntry[] | null; error: boolean }>({ list: null, error: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!open || !authUserId) return;
    let live = true;
    void fetchChangeHistory(authUserId, clientId).then((r) => live && setRows(r.ok ? { list: r.data, error: false } : { list: null, error: true }));
    return () => {
      live = false;
    };
  }, [open, authUserId, clientId, nonce]);
  const me = user.firstName?.trim() || "You";
  return (
    <BottomSheet open={open} onClose={onClose} title="Change history">
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 8 }}>{`Every change to ${firstName}'s plans and stage, newest first.`}</p>
      {rows.error ? (
        <ProError onRetry={() => setNonce((n) => n + 1)} />
      ) : !rows.list ? (
        <ProCardSkeleton lines={4} />
      ) : rows.list.length === 0 ? (
        <p style={{ padding: "10px 0", fontSize: textPx(12.5), color: INK.chF }}>No changes yet.</p>
      ) : (
        rows.list.map((r, i) => (
          <div key={r.id} className="flex" style={{ gap: 12, padding: "10px 0", borderBottom: i < rows.list!.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
            <Avatar name={me} url={user.avatarUrl} size={30} tone="teal" />
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                {r.line}
              </span>
              <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{`${me} · ${fmtDay(r.at)} · ${clock12(r.at)}`}</span>
            </span>
          </div>
        ))
      )}
    </BottomSheet>
  );
};

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchReservedNicknames, setNickname } from "../../../services/forum";
import { nicknameProblem, NICKNAME_PROBLEM_TEXT } from "../../../services/forum/rules";
import { rememberNickname } from "../../../components/forum/useForumMe";
import { t } from "../../../i18n/core";
import { coPrimary } from "./communityWebStyles";

/**
 * Website viewport v1, WC-CO.3 Choose a nickname (WC-CO Community Web v3,
 * "forum-nickname" / "-bad", literal): centred in the page, at most 480
 * wide, 14 apart: the title 28/36 700 (-0.5px), the line 15/24 #5B5349, the
 * field (44, r12, #F5F5F6, 1.5px #9A8CD6; #C0392B when it has a problem;
 * 17/24 600), the help line 13/20 600 (#8C8378: the format; #C0392B: the
 * problem) 6 closer, and Continue (44 #9A8CD6; 0.4 while the nickname has a
 * problem). Same checks as mobile: the format, the reserved words and your
 * own name here, the rest from the save (taken, the 30-day limit).
 */
export function NicknameWeb({
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
  // The help line names a problem once there is something to judge (or after a try).
  const shownProblem = (touched || value.trim().length >= 3) && problem ? problem : null;
  const shownError = serverError ?? (shownProblem ? t(NICKNAME_PROBLEM_TEXT[shownProblem]) : null);
  const bad = !!shownError;

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

  return (
    <div className="flex items-center justify-center" style={{ flex: 1, minHeight: 0 }}>
      <form
        data-co-nickname-screen
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 480, gap: 14 }}
      >
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.5px", color: "#241F1B" }}>{t("Choose a forum nickname")}</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>
          {t("Each time you post, you choose whether to use this nickname or your first name. Nobody in the community can see who is behind your nickname.")}
        </p>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setServerError(null);
          }}
          onBlur={() => setTouched(true)}
          dir="ltr"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          aria-label={t("Nickname")}
          aria-invalid={bad}
          aria-describedby="co-nickname-help"
          data-co-nickname-field
          style={{ height: 44, boxSizing: "border-box", borderRadius: 12, background: "#F5F5F6", border: `1.5px solid ${bad ? "#C0392B" : "#9A8CD6"}`, padding: "0 16px", fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B", outline: "none" }}
        />
        <p id="co-nickname-help" role={bad ? "alert" : undefined} style={{ margin: "-6px 2px 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: bad ? "#C0392B" : "#8C8378" }}>
          {shownError ?? t(NICKNAME_PROBLEM_TEXT.format)}
        </p>
        <button type="submit" aria-disabled={!!problem} data-co-continue className="co-web-press" style={{ ...coPrimary, gap: 8, opacity: problem && touched ? 0.4 : bad ? 0.4 : 1 }}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {t("Continue")}
        </button>
      </form>
    </div>
  );
}

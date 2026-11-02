import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ClipboardList, FilePlus2, Plus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useOnline } from "../../../hooks/useOnline";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { INK } from "../proInk";
import { ListCard, SectionHead, SoftLine } from "../client/kit";
import { ComingSoonPill } from "../ComingSoon";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../states";
import { ErrorLine, Fab } from "../library/libraryUi";
import { CHead } from "./moKit";
import { copyFormTemplate, fetchForms, listFormTemplates, type FormAssignment, type FormSummary, type FormTemplate } from "../../../services/pro/forms";
import { PRO_ROUTES } from "../subtypeLanes";
import { FORMS_PATH, checkInLine, intakeLine, templateMetaLine, templatesFor } from "./formsList";
import type { FormKind } from "./formModel";
import { t, tx } from "../../../i18n/core";

export { FORMS_PATH };

const CardRow: React.FC = () => <ProCardSkeleton lines={2} />;

/**
 * Release 3 · MO29 Forms (gen/r18.js forms18): CHead "Forms" / "What clients
 * fill in, and when"; the Intake / Check-ins tabs (segTabs h40, 13, 14
 * under); "Your forms" (listCard6: clipboard-list or calendar-check rows,
 * "Sent manually · {n} questions" / "Every week · {weekday} {time} · {n}
 * clients"); "Templates from Centium" (file-plus-2 rows with "Use"); the +
 * (fab10, "New form").
 *
 * Round D: every lane sends check-ins now (can_write_form, clinical included),
 * so every lane has the tabs. The templates come from the Database
 * (list_form_templates, the lane's and the any-lane ones); "Use" copies an
 * available one into a new form (use_form_template) and opens it, the
 * others say Coming soon. An intake form marked send_on_hire reads "Sent
 * automatically when someone hires you".
 */
export const FormsHome: React.FC = () => {
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const online = useOnline();
  const navigate = useNavigate();
  const back = useBack(PRO_ROUTES.more);
  const [tab, setTab] = useState<FormKind>(() => (new URLSearchParams(window.location.search).get("tab") === "check-ins" ? "check_in" : "intake"));
  const [data, setData] = useState<{ forms: FormSummary[]; assignments: FormAssignment[] } | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const checkIns = !!lane;
  const kind: FormKind = checkIns ? tab : "intake";

  const load = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchForms(authUserId).then((r) => {
      if (!live) return;
      if (r.ok) {
        setData(r.data);
        setState("ok");
      } else setState(r.offline ? "offline" : "error");
    });
    void listFormTemplates().then((r) => live && r.ok && setTemplates(r.data));
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  const pickTab = (k: string) => {
    const next = k === "check_in" ? "check_in" : "intake";
    setTab(next);
    navigate(next === "check_in" ? `${FORMS_PATH}?tab=check-ins` : FORMS_PATH, { replace: true });
  };

  const startFromTemplate = async (tpl: FormTemplate) => {
    if (busy || !tpl.available) return;
    if (!online) return setErr(t("You're offline. Try again when you're connected."));
    setBusy(tpl.key);
    setErr(null);
    const r = await copyFormTemplate(tpl.key);
    setBusy(null);
    if (!r.ok) return setErr(t(r.message));
    navigate(`${FORMS_PATH}/${r.id}`);
  };

  const mine = (data?.forms ?? []).filter((f) => f.kind === kind);
  const offered = templatesFor(templates ?? [], kind);

  return (
    <div style={{ paddingBottom: 120 }}>
      <CHead title={t("Forms")} sub={t("What clients fill in, and when")} onBack={back} />
      {checkIns && (
        <SegmentedTabs
          className="mb-[14px]"
          items={[
            { key: "intake", label: tx("Intake", "form") },
            { key: "check_in", label: t("Check-ins") },
          ]}
          activeKey={kind}
          onChange={pickTab}
          tabHeight={40}
          labelSize={13}
        />
      )}
      {state === "offline" && data && <OfflineLine />}
      {err && <ErrorLine>{err}</ErrorLine>}

      <SectionHead label={t("Your forms")} />
      {state === "loading" && !data ? (
        <ListSkeleton rows={2} row={CardRow} />
      ) : !data ? (
        <ProError onRetry={load} />
      ) : mine.length ? (
        <ListCard
          rows={mine.map((f) => ({
            key: f.id,
            icon: f.kind === "intake" ? ClipboardList : CalendarCheck,
            title: f.title,
            meta: f.kind === "intake" ? intakeLine(f) : checkInLine(f, data.assignments),
            onClick: () => navigate(`${FORMS_PATH}/${f.id}`),
          }))}
        />
      ) : (
        <SoftLine icon={kind === "intake" ? ClipboardList : CalendarCheck}>
          {kind === "intake" ? t("No intake forms yet. Start one with + or from a template.") : t("No check-ins yet. Start one with + or from a template.")}
        </SoftLine>
      )}

      {offered.length > 0 && (
        <>
          <div style={{ height: 4 }} />
          <SectionHead label={t("Templates from Centium")} />
          <ListCard
            rows={offered.map((tpl) => ({
              key: tpl.key,
              icon: FilePlus2,
              title: tpl.title,
              meta: templateMetaLine(tpl),
              trailing: tpl.available ? (
                <button
                  type="button"
                  onClick={() => void startFromTemplate(tpl)}
                  disabled={!!busy}
                  aria-label={t("Use {name}", { name: tpl.title })}
                  className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']"
                  style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, opacity: busy && busy !== tpl.key ? 0.5 : 1 }}
                >
                  {busy === tpl.key ? t("Adding…") : t("Use")}
                </button>
              ) : (
                <ComingSoonPill />
              ),
            }))}
          />
        </>
      )}
      <Fab label={t("New form")} icon={Plus} onClick={() => navigate(`${FORMS_PATH}/new/${kind === "check_in" ? "check-in" : "intake"}`)} />
    </div>
  );
};

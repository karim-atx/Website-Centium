import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ChevronRight, MoreVertical, Plus } from "lucide-react";
import { PopupMenu } from "../ui/PopupMenu";
import { useWebLayout } from "../web/useWebLayout";
import { HeaderCta, HeaderMenuButton, HealthWebBody, HealthWebHeader } from "../../pages/health/web/HealthWebKit";
import { HEALTH_DISCLAIMER } from "../../services/legal/disclaimer";
import type { CheckState } from "../../services/health-checks/checkStatus";
import { t, tx } from "../../i18n/core";

// Website viewport v1 · WC-HE.8 Your health checks (WC-HE Records Web v3,
// "checks" screens), the general plan from 1024px wide. GeneralPlan.tsx keeps
// the rows, rules, store and every popup / sheet; this file lays them out:
// - the header: back, the title with the framing line under it (KEEP-SAFETY,
//   verbatim), "Add a check" as the 40 header button and ⋮ with Hidden checks
//   (both once the account's checks have loaded, as on mobile);
// - 8 fr : 4 fr (1 : 1 at the rail), gap 24: the checks card on the left (r18,
//   0.5px #241F1B@10%; rows min 68, pad 10 16, gap 14: the done circle 26 (#357A4D
//   with a 14 white check, else a 2px #C9C2B8 ring), the name 15/22 600 and its
//   frequency 13/20 #8C8378, the status word 13/18 700 (up to date #357A4D,
//   due #8A6418, otherwise #5B5349) over "Last … · Next …" 13/18 (#8C8378 labels,
//   #5B5349 values), the bell 18 #7D6BB5 (full when due, 60% otherwise) for the
//   row's reminder, ⋮ with Edit · Hide / Delete · Set a reminder);
// - on the right the plan's intro (lavender box), Set a personal reminder (min
//   60, r18, hairline, bell 18 #5F5093, 15 600, chevron 16 #8C8378) and the
//   disclaimer 13/20 #5B5349.
// Not carried over from the reference: its warning-signs card (that copy
// belongs to another plan on this route, which this page never names) and its
// "Right-hand dates …" note (not part of this plan's copy).

const TONE_INK: Record<CheckState["tone"], string> = { good: "#357A4D", due: "#8A6418", neutral: "#5B5349" };

export interface WebCheckRow {
  id: string;
  name: string;
  frequency: string;
  who?: string;
  state: CheckState;
  done: boolean;
  custom?: boolean;
}

export const GeneralPlanWeb: React.FC<{
  title: string;
  subtitle: string;
  intro: string;
  ready: boolean;
  rows: WebCheckRow[];
  hiddenCount: number;
  noAge: boolean;
  error: React.ReactNode;
  onMark: (id: string) => void;
  onEdit: (id: string) => void;
  onHide: (id: string) => void;
  onRemind: (id: string) => void;
  onAdd: () => void;
  onHidden: () => void;
  onPersonalReminder: () => void;
  overlays: React.ReactNode;
}> = ({ title, subtitle, intro, ready, rows, hiddenCount, noAge, error, onMark, onEdit, onHide, onRemind, onAdd, onHidden, onPersonalReminder, overlays }) => {
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const [menuBtn, setMenuBtn] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ row: WebCheckRow; el: HTMLElement } | null>(null);
  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }} data-web-page="checks">
      <HealthWebHeader
        title={title}
        sub={subtitle}
        back
        records
        actions={
          ready ? (
            <>
              <HeaderCta label={t("Add a check")} icon={<Plus size={18} />} onClick={onAdd} />
              <HeaderMenuButton ref={setMenuBtn} open={menuOpen} onClick={() => setMenuOpen(true)} />
            </>
          ) : undefined
        }
      />
      <HealthWebBody gap={24}>
        <div className="grid items-start" style={{ gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24 }}>
          <div className="min-w-0 flex flex-col" style={{ gap: 10 }}>
            {rows.length > 0 ? (
              <section className="overflow-hidden flex flex-col" style={{ borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)" }} aria-label={t("Your checks")} data-web-checks>
                {rows.map((row, i) => {
                  const due = row.state.tone === "due";
                  return (
                    <div key={row.id} className="flex items-center" style={{ minHeight: 68, padding: "10px 16px", gap: 14, borderTop: i ? "0.5px solid rgba(36,31,27,0.08)" : undefined }} data-web-check={row.id}>
                      {ready && (
                        <button
                          type="button"
                          onClick={() => onMark(row.id)}
                          aria-label={row.done ? t("{name}: done. Change or undo", { name: row.name }) : t("Mark {name} as done", { name: row.name })}
                          className="shrink-0 grid place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
                          style={{ width: 26, height: 26, boxSizing: "border-box", background: row.done ? "#357A4D" : "transparent", border: row.done ? "none" : "2px solid #C9C2B8" }}
                        >
                          {row.done && <Check size={14} strokeWidth={3} color="#FFFFFF" aria-hidden />}
                        </button>
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
                          {row.name}
                        </span>
                        <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                          {row.frequency}
                        </span>
                        {row.who && <span className="sr-only">{row.who}</span>}
                      </span>
                      <span className="shrink-0 flex flex-col items-end text-end" style={{ gap: 2 }}>
                        <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "18px", fontWeight: 700, color: TONE_INK[row.state.tone] }}>
                          {t(row.state.word)}
                        </span>
                        {(row.state.last !== null || row.state.next !== null) && (
                          <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "18px", color: "#5B5349", fontVariantNumeric: "tabular-nums" }}>
                            {row.state.last !== null && (
                              <>
                                <span style={{ color: "#71685E" }}>{t("Last")}</span> {t(row.state.last)}
                              </>
                            )}
                            {row.state.last !== null && row.state.next !== null && " · "}
                            {row.state.next !== null && (
                              <>
                                <span style={{ color: "#71685E" }}>{tx("Next", "next due")}</span> {t(row.state.next)}
                              </>
                            )}
                          </span>
                        )}
                      </span>
                      {ready && (
                        <button
                          type="button"
                          onClick={() => onRemind(row.id)}
                          aria-label={t("Reminder for {name}", { name: row.name })}
                          className="shrink-0 grid place-items-center rounded-full hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                          style={{ width: 32, height: 32, opacity: due ? 1 : 0.6 }}
                        >
                          <Bell size={18} style={{ color: "#7D6BB5" }} aria-hidden />
                        </button>
                      )}
                      {ready && (
                        <button
                          type="button"
                          onClick={(e) => setRowMenu({ row, el: e.currentTarget })}
                          aria-label={t("More options")}
                          aria-haspopup="menu"
                          className="shrink-0 grid place-items-center rounded-full hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                          style={{ width: 32, height: 32, marginInlineStart: -8, marginInlineEnd: -6 }}
                        >
                          <MoreVertical size={18} style={{ color: "#71685E" }} aria-hidden />
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center text-center" style={{ borderRadius: 20, background: "#F5F5F6", padding: "40px 24px", gap: 6 }} data-web-checks-empty>
                <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349", maxWidth: 380 }}>
                  {noAge && hiddenCount === 0 ? t("Add your date of birth in Profile to see checks for your age.") : t("No checks to show. Add a check you want to keep track of.")}
                </p>
                {noAge && hiddenCount === 0 ? (
                  <button type="button" onClick={() => navigate("/app/profile")} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ fontSize: 15, fontWeight: 700, color: "#7D6BB5" }}>
                    {t("Go to Profile")}
                  </button>
                ) : (
                  hiddenCount > 0 && (
                    <button type="button" onClick={onHidden} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ fontSize: 15, fontWeight: 700, color: "#7D6BB5" }}>
                      {t("Show hidden checks")}
                    </button>
                  )
                )}
              </div>
            )}
            {error}
          </div>
          <aside className="min-w-0 flex flex-col" style={{ gap: 12 }}>
            <div style={{ borderRadius: 18, padding: "16px 18px", background: "rgba(154,140,214,0.12)" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{intro}</p>
            </div>
            <button
              type="button"
              onClick={onPersonalReminder}
              className="flex items-center text-start hover:bg-[#FAF9FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ minHeight: 60, borderRadius: 18, border: "0.5px solid rgba(36,31,27,0.1)", padding: "0 16px", gap: 12 }}
            >
              <Bell size={18} style={{ color: "#5F5093" }} aria-hidden />
              <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: "#241F1B" }}>
                {t("Set a personal reminder")}
              </span>
              <ChevronRight size={16} style={{ color: "#71685E" }} aria-hidden />
            </button>
            <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{t(HEALTH_DISCLAIMER)}</p>
          </aside>
        </div>
      </HealthWebBody>
      <PopupMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuBtn}
        width={200}
        align="right"
        variant="health"
        options={[{ value: "hidden", label: t("Hidden checks ({n})", { n: hiddenCount }) }]}
        onSelect={() => {
          setMenuOpen(false);
          onHidden();
        }}
      />
      <PopupMenu
        open={!!rowMenu}
        onClose={() => setRowMenu(null)}
        anchor={rowMenu?.el ?? null}
        width={184}
        align="right"
        variant="health"
        options={[
          { value: "edit", label: t("Edit") },
          { value: "hide", label: rowMenu?.row.custom ? t("Delete") : t("Hide"), destructive: !!rowMenu?.row.custom },
          { value: "remind", label: t("Set a reminder") },
        ]}
        onSelect={(v) => {
          const row = rowMenu?.row;
          setRowMenu(null);
          if (!row) return;
          if (v === "edit") onEdit(row.id);
          if (v === "hide") onHide(row.id);
          if (v === "remind") onRemind(row.id);
        }}
      />
      {overlays}
    </div>
  );
};

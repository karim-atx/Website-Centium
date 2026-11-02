import { useState } from "react";
import { ChevronRight, PenLine, Sparkles } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { usePremium } from "../../../services/premium/hooks";
import { useG3, useG3Available } from "../../../components/premium/g3/useG3";
import { G3Body, LockedRow } from "../../../components/premium/g3/parts";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { fetchPromptLibrary, fetchPromptOfTheDay } from "../../../services/premium/g3Calls";
import { groupPrompts, promptHeading } from "../../../services/premium/g3";
import { t, tn } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · journal prompts on Mind › Journal. With Premium: the prompt of
// the day (journal_prompt_of_the_day(), the same all day) and the library
// by group (journal_prompt_library()); a prompt opens a new entry with the
// prompt as its heading. A free member sees the library's groups with their
// prompts locked (the label opens the prompt sheet) and can always write
// freely. The journal stays private and lockable as today: a prompt only
// fills the new entry's title, and a shut folder still asks for its password.
// Nothing at all while the switch is off.

export function JournalPrompts({ onWrite, className = "" }: { onWrite: (heading: string) => void; className?: string }) {
  const on = useG3Available();
  const { premium } = usePremium();
  const isPremium = !!premium?.premium;
  const today = useG3(fetchPromptOfTheDay, "prompt-of-the-day", isPremium);
  const [open, setOpen] = useState(false);
  if (!on) return null;
  const prompt = today.state.kind === "ready" ? today.state.value : null;

  return (
    <div data-g3="journal-prompts" className={className}>
      {prompt && (
        <div className="rounded-[22px] bg-primary-pale px-5 py-4 mb-2.5">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.1em] rtl:tracking-normal text-primary-deep-text">
            <Sparkles size={13} aria-hidden />
            {t("Today's prompt")}
          </p>
          <p className="mt-1.5 text-[15px] leading-[22px] font-semibold text-charcoal [overflow-wrap:anywhere]">{prompt.text}</p>
          <button
            type="button"
            onClick={() => onWrite(promptHeading(prompt.text))}
            className="tap mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary-fill text-on-primary-fill text-[12.5px] font-bold"
          >
            <PenLine size={14} aria-hidden />
            {t("Write about this")}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap w-full flex items-center justify-between gap-2 min-h-11 mb-2.5 text-[12.5px] font-bold text-th-6b41ef dark:text-primary-dark"
      >
        <span className="flex items-center gap-2">
          {t("Journal prompts")}
          {!isPremium && <PremiumLabel />}
        </span>
        <ChevronRight size={15} aria-hidden className="rtl:-scale-x-100" />
      </button>
      {open && (
        <PromptLibrarySheet
          onClose={() => setOpen(false)}
          onPick={(text) => {
            setOpen(false);
            onWrite(promptHeading(text));
          }}
        />
      )}
    </div>
  );
}

function PromptLibrarySheet({ onClose, onPick }: { onClose: () => void; onPick: (text: string) => void }) {
  const { state, reload } = useG3(fetchPromptLibrary, "prompt-library");
  return (
    <BottomSheet open onClose={onClose} title={t("Journal prompts")}>
      <div className="pb-4">
        <p className="mb-3 text-[12px] leading-[17px] text-charcoal-faint">{t("Pick a prompt to start a new entry with it as the title. You can always write freely too.")}</p>
        <G3Body state={state} onRetry={reload}>
          {(rows) => (
            <div className="space-y-4">
              {groupPrompts(rows).map((g) => {
                const open = g.prompts.filter((p) => !p.locked && p.text);
                return (
                  <section key={g.key} aria-label={g.title}>
                    <p className="mb-1.5 text-[12.5px] font-bold text-charcoal">{g.title}</p>
                    {open.length === 0 ? (
                      <LockedRow feature="journal_prompts" title={g.title} meta={tn(g.prompts.length, "{n} prompt", "{n} prompts")} />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {open.map((p) => (
                          <button
                            key={p.number}
                            type="button"
                            onClick={() => onPick(p.text!)}
                            className="tap w-full rounded-xl bg-cream-soft px-3.5 py-2.5 text-start text-[13px] leading-[19px] text-charcoal [overflow-wrap:anywhere]"
                          >
                            {p.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </G3Body>
      </div>
    </BottomSheet>
  );
}

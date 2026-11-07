import { Check, Globe } from "lucide-react";
import { usePaneSpan } from "../../components/web/paneFill";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsSection } from "../../components/ui/SettingsRows";
import { useApp } from "../../context/AppContext";
import { APP_LANGUAGES } from "../../i18n/languages";

// MO1.8.5 Language, as a page (was a sheet), layout only (C36).
//
// TWO LANGUAGES, NOT THE BOARD'S NINE (see APP_LANGUAGES), each listed by
// its own name with the trailing check on the current one.

export default function LanguagePage() {
  const { language, setLanguage, t } = useApp();
  const inPane = usePaneSpan();

  if (inPane)
    // Website viewport (ST Settings Web, `language`): the App language label (13/20 700 .14em caps #7D67D9 over the
    // 1.5 #AEA1DC rule), rows of 48 (8 0, gap 14) with the globe tile (36 r11 #F0EDF9, 18 #7D67D9), the name 15/24 600
    // and the radio (22; on #9A8CD6 with a white check 12/3; off the 1.5 20% ring), the rule from 50 between rows.
    return (
      <div>
        <PageHeader title={t("Language")} showBack sub tightBack />
        <section aria-label={t("App language")}>
          <h2 className="rtl:tracking-normal" style={{ margin: 0, paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#7D67D9" }}>
            {t("App language")}
          </h2>
          <div role="radiogroup" aria-label={t("App language")}>
            {APP_LANGUAGES.map((l, i) => {
              const selected = language === l.code;
              return (
                <button key={l.code} type="button" role="radio" aria-checked={selected} lang={l.code} onClick={() => setLanguage(l.code)} className="relative w-full flex items-center text-start" style={{ gap: 14, minHeight: 48, padding: "8px 0", boxSizing: "border-box" }}>
                  {i > 0 && <span aria-hidden className="absolute" style={{ insetInlineStart: 50, insetInlineEnd: 0, top: 0, height: 1, background: "rgba(174,161,220,0.18)" }} />}
                  <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: "#F0EDF9" }}>
                    <Globe size={18} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
                  </span>
                  <span className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{l.name}</span>
                  <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 9999, boxSizing: "border-box", border: selected ? "none" : "1.5px solid rgba(36,31,27,0.2)", background: selected ? "#9A8CD6" : "transparent" }}>
                    {selected && <Check size={12} strokeWidth={3} style={{ color: "#FFFFFF" }} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );

  return (
    <div>
      <PageHeader title={t("Language")} showBack sub tightBack />
      {/* MO1.8.5: 24 pt side insets; the label 16 under the 36 pt title. */}
      <SettingsBody className="-mt-1">
      <SettingsSection label={t("App language")}>
        <div role="radiogroup" aria-label={t("App language")}>
          {APP_LANGUAGES.map((l) => {
            const selected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={selected}
                lang={l.code}
                onClick={() => setLanguage(l.code)}
                className="tap relative w-full flex items-center justify-between gap-3 text-start [padding-block:calc(13px_+_var(--row-extra,0px)_/_2)] before:content-[''] before:absolute before:bottom-0 before:start-[50px] before:end-0 before:h-px before:bg-charcoal/[0.06] before:pointer-events-none last:before:hidden"
              >
                {/* MO1.8.5: rows 45 pt apart, so 13 + 19 + 13; the check is 18 / 2.4. */}
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[15px] leading-[19px] font-medium text-charcoal">{l.name}</span>
                </span>
                {selected && <Check size={18} strokeWidth={2.4} className="text-primary shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </SettingsSection>
      </SettingsBody>
    </div>
  );
}

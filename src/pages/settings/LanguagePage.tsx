import { Check } from "lucide-react";
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

  return (
    <div>
      <PageHeader title={t("Language")} showBack sub tightBack />
      {/* MO1.8.5: 24 pt side insets; the label 16 under the 36 pt title. */}
      <SettingsBody className="-mt-1">
      <SettingsSection label="App language">
        <div role="radiogroup" aria-label="App language">
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
                  {/* Round F (F7): Beta until every area is translated. */}
                  {l.beta && (
                    <span lang={language} className="rounded-full bg-primary-pale px-2 py-0.5 text-[11px] font-bold leading-[14px] text-primary-accent">
                      {t("Beta")}
                    </span>
                  )}
                </span>
                {selected && <Check size={18} strokeWidth={2.4} className="text-primary shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </SettingsSection>
      <p className="mt-3 px-1 text-[12.5px] leading-[18px] text-charcoal-faint">
        {t("Arabic is in beta: some screens are still in English while we translate them.")}
      </p>
      </SettingsBody>
    </div>
  );
}

import { Check } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsSection } from "../../components/ui/SettingsRows";
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
      <PageHeader title={t("Language")} showBack sub />
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
                <span className="text-[15px] leading-[19px] font-medium text-charcoal">{l.name}</span>
                {selected && <Check size={18} strokeWidth={2.4} className="text-primary shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}

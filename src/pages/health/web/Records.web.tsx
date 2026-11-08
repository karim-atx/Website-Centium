import React, { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import type { HeaderMenuItem } from "../../../components/health/records/RecordsHeader";
import { HEALTH_DISCLAIMER } from "../../../services/legal/disclaimer";
import { t } from "../../../i18n/core";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { HeaderCta, HeaderMenuButton, HealthWebBody, HealthWebHeader, WebSegmented } from "./HealthWebKit";

// Website viewport v1 · WC-HE.9 Biomarkers & imaging (WC-HE Records Web v3):
// the page header (back, the title 24/30 700, the tab's action as a 40 button
// in the header instead of the mobile pinned one, ⋮ with its menu), then the
// Biomarkers / Labs / Imaging / History tabs across the page (40 tall), the
// "Shared with" banner, the marker search (Biomarkers), the tab's body and the
// disclaimer. The tab bodies, sheets and popups are the mobile page's
// (HealthRecords.tsx); Biomarkers draws its web split itself.

export const RecordsWeb: React.FC<{
  tabs: { key: string; label: string }[];
  tab: string;
  onTab: (key: string) => void;
  menu?: HeaderMenuItem[];
  cta: { label: string; icon?: React.ReactNode; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void };
  shared: { label: string; onManage: () => void } | null;
  search: { query: string; onQuery: (q: string) => void } | null;
  overlays: React.ReactNode;
  children: React.ReactNode;
}> = ({ tabs, tab, onTab, menu, cta, shared, search, overlays, children }) => {
  const [menuBtn, setMenuBtn] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const { rail } = useWebLayout();
  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }} data-web-page="records">
      <HealthWebHeader
        title={t("Biomarkers & imaging")}
        back
        records
        actions={
          <>
            <HeaderCta label={cta.label} icon={cta.icon} onClick={cta.onClick} />
            {menu && menu.length > 0 && <HeaderMenuButton ref={setMenuBtn} open={open} onClick={() => setOpen(true)} />}
          </>
        }
      />
      <HealthWebBody gap={20}>
        <WebSegmented items={tabs} active={tab} onChange={onTab} ariaLabel={t("Biomarkers & imaging")} />
        {shared && (
          <div data-records-shared className="flex items-center" style={{ gap: 10, borderRadius: 14, paddingInline: "16px 4px", minHeight: 44, background: "#EAF4F2" }}>
            <ShieldCheck size={16} strokeWidth={2} className="shrink-0" style={{ color: "#3C6B65" }} aria-hidden />
            <span className="flex-1 min-w-0" style={{ padding: "10px 0", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#241F1B" }}>
              {shared.label}
            </span>
            <button type="button" onClick={shared.onManage} className="shrink-0 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ minHeight: 40, padding: "0 12px", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093" }}>
              {t("Manage")}
            </button>
          </div>
        )}
        {search && (
          <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24 }}>
          <label className="flex items-center" style={{ height: 40, boxSizing: "border-box", borderRadius: 12, padding: "0 14px", gap: 8, background: "#F5F5F6", border: "0.5px solid rgba(36,31,27,0.06)" }}>
            <Search size={16} style={{ color: "#71685E" }} aria-hidden />
            <input
              type="search"
              value={search.query}
              onChange={(e) => search.onQuery(e.target.value)}
              placeholder={t("Search markers")}
              aria-label={t("Search markers")}
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-[#71685E]"
              style={{ fontSize: 15, lineHeight: "24px", color: "#241F1B" }}
            />
          </label>
          </div>
        )}
        <div data-records-body>{children}</div>
        <p className="text-center" style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
          {t(HEALTH_DISCLAIMER)}
        </p>
      </HealthWebBody>
      {menu && menu.length > 0 && (
        <PopupMenu
          open={open}
          onClose={() => setOpen(false)}
          anchor={menuBtn}
          options={menu.map((m) => ({ value: m.key, label: m.label, icon: m.icon, destructive: m.destructive }))}
          onSelect={(v) => {
            setOpen(false);
            menu.find((m) => m.key === v)?.onSelect();
          }}
          width={184}
          align="right"
        />
      )}
      {overlays}
    </div>
  );
};

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { marketPalette } from "../../../theme/marketTokens";
import { OfferEditor, type AppliesToOption } from "../../../components/market/offers/OfferEditor";
import { fetchSessionTypes } from "../../../services/pro/calendar";
import { fetchProfileFacts, fetchServicePlans } from "../../../services/pro/profile";
import { money } from "../../../services/offers/manage";
import { ownerInitials } from "../../../services/offers";
import type { ProfessionalSubtype } from "../../../types";
import { t, tk } from "../../../i18n/core";

// Market + Share 3.0 · W3 · P-MA.3 Create offer → Preview and publish
// (/app/pro/marketplace/offers/new) and the same editor for an existing offer
// (/offers/:offerId). Professional copy: types % off · Amount off · Free
// session; "Applies to" one of the professional's live services (active
// appointment_services session types and professional_plans, "4-session
// pack · $120"); Where In person · Online · Both; the preview's client card
// "{Name} · {specialty}" from the live profile (the first specialty, else the
// professional type) and "Shows in Rewards under Professionals, and on your
// public profile."

const HOME = "/app/pro/marketplace";

/** The professional type as a card line ("Trainer"), when no specialty is set. */
const TYPE_LINE: Record<ProfessionalSubtype, string> = {
  trainer: tk("Trainer"),
  physiotherapist: tk("Physiotherapist"),
  dietitian: tk("Dietitian"),
  doctor: tk("Doctor"),
  nutritionist: tk("Nutritionist"),
  coach_instructor: tk("Coach"),
  other: tk("Health professional"),
};

export default function OfferEditorPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { authUserId, user } = useApp();
  const m = marketPalette(useIsDark());
  const [options, setOptions] = useState<AppliesToOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [specialty, setSpecialty] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    void Promise.all([fetchSessionTypes(authUserId), fetchServicePlans(authUserId), fetchProfileFacts(authUserId)]).then(([types, plans, facts]) => {
      if (!alive) return;
      if (facts.ok) setSpecialty(facts.data.specialties.find((s) => s.trim())?.trim() ?? null);
      if (!types.ok || !plans.ok) {
        setFailed(true);
        return;
      }
      setOptions([
        ...types.data.map((st) => ({ id: st.id, label: `${st.name} · ${money(st.price)}` })),
        ...plans.data.filter((p) => p.active).map((p) => ({ id: p.id, label: `${p.name} · ${money(p.price)}` })),
      ]);
    });
    return () => {
      alive = false;
    };
  }, [authUserId]);

  const name = user.firstName?.trim() || t("You");
  const line = specialty ?? (user.professionalSubtype ? t(TYPE_LINE[user.professionalSubtype]) : null);
  const previewOwner = useMemo(() => ({ name: line ? `${name} · ${line}` : name, initials: ownerInitials(name), logoUrl: user.avatarUrl ?? null }), [name, line, user.avatarUrl]);
  const isNew = !offerId || offerId === "new";
  const list = `${HOME}/offers`;

  return (
    <OfferEditor
      key={offerId ?? "new"}
      variant="professional"
      owner={{ variant: "professional" }}
      offerId={isNew ? null : (offerId ?? null)}
      previewOwner={previewOwner}
      appliesTo={{
        options,
        failed,
        emptyHint: (
          <>
            {t("Add a session type or a package first, then offer a discount on it.")}{" "}
            <Link to={`${HOME}/showcase`} className="market-focus" style={{ color: m.pdark, fontWeight: 700 }}>
              {t("Go to Showcase")}
            </Link>
          </>
        ),
      }}
      onClose={() => navigate(list)}
      onDone={(flash) => navigate(list, { state: { offerFlash: flash } })}
    />
  );
}

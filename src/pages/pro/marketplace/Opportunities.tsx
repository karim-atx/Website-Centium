import { useNavigate } from "react-router-dom";
import { MarketplaceEmpty } from "./showcaseParts";

// Market + Share 3.0 · W3 · the P-MA Opportunities tab. Openings, applications
// and My work (P-MA.5) are Release 2 (DB8; W4 builds them). Until then a
// quiet designed state in the handover's empty drawing (Professional
// Marketplace Screens lines 218–225: the 56 tile, 16 / 800 title, 13 / 1.55
// --faint body, the outlined CTA), whose CTA keeps the live ProfessionalExplore
// (/app/marketplace) reachable (D-39). The strings are ours.

export function OpportunitiesTab() {
  const navigate = useNavigate();
  return (
    <MarketplaceEmpty
      icon="briefcase"
      title="Openings from gyms are coming soon"
      body="Gyms will post roles and class slots here. Until then, find gyms and colleagues in Explore."
      cta="Gyms and colleagues"
      onCta={() => navigate("/app/marketplace")}
    />
  );
}

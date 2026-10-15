import { Navigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";

/**
 * /app/profile/cv. Release 3 W6: the CV is edited in MO14 Edit public
 * profile (/app/more/edit-profile), whose rows open every CV section's sheets
 * (components/cv/CvEditor), and the client's view of it is MO3 (Preview).
 * The old link keeps working: a professional lands on MO14. Only
 * professionals ever had a CV; everyone else goes to Profile, as before.
 */
export default function MyCv() {
  const { user } = useApp();
  return <Navigate to={user.accountType === "professional" ? "/app/more/edit-profile" : "/app/profile"} replace />;
}

import MyBusinessesPage from "../../professionals/MyBusinessesPage";

/**
 * Release 3 · Businesses (/app/more/businesses, MO9; several businesses,
 * decision 1). Owned by W6, which replaces this file and deletes
 * MyBusinessesPage after checking parity (invitations, console links, join
 * requests, leave). Until then the existing page is mounted here.
 */
export default function Businesses() {
  return <MyBusinessesPage />;
}

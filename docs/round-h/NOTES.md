# Round H (EU): gyms that keep their own entry system

Built against the Database's Round H (Database-Atraxia PR #64), migration `20261226380000`, "Round H · Gyms keep their own entry systems" in its `docs/HANDOVER_API.md`. The names below are the ones the Database session sent on 2026-11-04. EW (the email logo) shipped separately in #75.

## Where each part lives

| Part | Files |
|---|---|
| Entry settings (decision 2) | `pages/business-more/LocationsPage.tsx` (`EntrySheet`), `services/business-more/index.ts` (`fetchLocations`, `updateEntryRules`) |
| Shared rules, labels, ATXU words | `services/venues/entrySystem.ts` (+ test) |
| Front desk › Entry system (decisions 3, 6) | `pages/business-ops/frontdesk/EntrySystemTab.tsx`, `FrontDeskPage.tsx`, `FrontDeskPage.web.tsx`, `services/front-desk/entrySystem.ts` |
| Export (decision 4) | `EntrySystemTab.tsx`, `services/front-desk/entryExportModel.ts` (+ test) |
| Consent checkbox (decision 5) | `components/marketplace/EntrySharingCheck.tsx`, `useVenueEntrySystem.ts`, `pages/marketplace/GymPage.tsx`, `components/profile/MembershipsCard.tsx` (member codes), `services/venues/index.ts` (`agreeToGymEntrySharing`) |
| Member pass (decision 7) | `components/marketplace/MembershipPass.tsx`, `services/venues/index.ts` (`my_gym_memberships`' new columns) |
| Featured weeks | `pages/business-market/FeatureSheets.tsx`: ATXQ4 (no credit, migration `20261226390000`) opens the same "Buy in the Centium app" view as ATXQ3 |
| Arabic | `i18n/ar/bizops.ts`, `i18n/ar/market.ts` |

## Decisions applied

1. **Entry settings:** the venue's "Entry and check-in" sheet gains the four Centium methods and the entry-system picker.
   - The methods are QR code, Pass code, Tap (NFC) and Bluetooth.
   - The picker offers none, key cards/fobs, PIN keypad, biometric reader, turnstile or gate, Kisi, Brivo, Salto, Paxton, gym software, and other, which needs a name. The name is one line of up to 80 characters and optional for the other types.
   - One Save writes everything. The sheet blocks "no Centium method and no own system" before the database does.
2. **QR and pass code are separate switches** (the Database's option a):
   - The QR shows the 30-second code when the pass code is on and the device has a secret.
   - Otherwise it shows the static token when QR is on.
   - With only the pass code on and no secret yet, it shows "Setting up your pass code" and never the static token, which the desk would refuse (ATXU0).
3. **The front desk tab** shows only while the desk venue's `entry_system` isn't `none`.
   - The lists show first names (Centium stores no surname) and the member number. External IDs are masked to the last 4 characters.
   - The enrol sheet shows the ID in full and prefills a renewal's previous ID.
   - Both marks have a toast Undo, which the Database allows for 10 minutes.
4. **The export** is offered only to the owner, or to staff whose role is `manager`.
   - It is a CSV of every active member plus today's changes, built in the browser with the shared CSV writer (formula guard).
   - The last 5 exports are listed. The person who exported shows as "by you" or "by a manager", because the log gives only a user id.
5. **The consent checkbox** shows only at a gym with its own system, in both the purchase sheet and member-code redemption.
   - The member has to tick it before Confirm or Join.
   - The agreement is recorded first (`agree_to_gym_entry_sharing`, wording key `gym_entry_sharing_v1`), then the purchase or redemption runs.
6. **External ID:** optional, trimmed, one line of up to 64 characters (ATXU4 otherwise).
7. **Asking and withdrawing on the pass:** a member who joined before the gym set its own system is `needed` in `my_gym_entry_sharing`. Their pass asks for the same checkbox and an Agree button, and until then the desk sees them only as a count. Once they agree, the pass shows what is shared and "Stop sharing" (`withdraw_gym_entry_sharing`, behind a confirm), which puts them on Memberships ending.
8. **At the desk,** scanning a pass whose method the gym turned off shows ATXU0 in words.
9. **The enrol sheet** says the ID is never biometric data, as the handover requires.
10. **With every Centium method off,** the pass shows "{gym} uses its own entry system" and its type, with no switch, QR, code, devices or Wallet.

## Before the Database is live

Every read falls back to today's behaviour:
- missing functions or columns read as no own system;
- the settings save leaves out the new columns while they are still at their defaults.

Checked through the read-only proxy with no fixtures: the screens and pass are unchanged.

## Not done

- `set_entry_external_id` (changing an enrolled member's ID) has a service function but no screen. Enrolled members aren't listed anywhere.
- The Export reports page doesn't offer the entry system export. It lives in the front desk tab, next to the lists it summarises.
- The person who exported isn't resolved to a name.

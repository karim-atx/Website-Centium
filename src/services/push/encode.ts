// Encoding the browser's subscription keys for the sender. Pure, and in its
// own file so the rule can be tested without opening a Supabase client — the
// same split collapse.ts and messagePushUrl.ts already use in this directory.
//
// BASE64URL, NOT BASE64, AND THE DIFFERENCE IS NOT COSMETIC. RFC 8291 carries
// p256dh and auth as base64url (RFC 4648 §5): `-` and `_` in place of `+` and
// `/`, and no `=` padding. `btoa()` emits standard base64, which was what this
// did until the fix — so roughly five eighths of real subscriptions shipped at
// least one `+` or `/` in a 65-byte key, and every one of those decoded to the
// wrong bytes or failed outright at the sender.
//
// WHY IT WAS INVISIBLE. Nothing on the way out complains: the column is `text`
// with a non-blank CHECK and no format constraint, the insert succeeds, and the
// subscription looks registered. The failure happens later and elsewhere — in
// the Edge Functions, where @negrel/webpush decodes the pair — so the browser
// that caused it never hears about it.

/**
 * A `Uint8Array` as base64url: no `+`, no `/`, no `=`.
 *
 * Split from encodeKey so the transform is testable on bytes directly, without
 * manufacturing an ArrayBuffer for every case.
 */
export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is still the right primitive — it is only its ALPHABET that is wrong,
  // and the three substitutions below are the whole of RFC 4648 §5.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The browser's keys, base64url-encoded the way the sender needs them.
 *
 * Null in, null out: `subscription.getKey()` returns null when a key is absent,
 * and the caller refuses to record a subscription missing either one rather
 * than inventing a value for a NOT NULL column.
 */
export function encodeKey(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  return base64url(new Uint8Array(buffer));
}

// The suspension sentence and code on their own, free of any fetch or DOM
// types, so pure modules (and their node tests) can use them. suspension.ts
// re-exports both.

/** The one sentence a suspended user should ever see, wherever they hit it. */
export const SUSPENDED_MESSAGE =
  "Your account has been suspended. Contact support if you believe this is a mistake.";

/** Supabase's error code for a banned user, as shipped in auth-js's ErrorCode union. */
export const USER_BANNED_CODE = "user_banned";

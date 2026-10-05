// The app's languages, each by its own name (MO1.8.5 lists them that way).
// Only English and Arabic exist; the board's other seven wait for the
// language decision and their translations (C36).
export const APP_LANGUAGES: { code: "en" | "ar"; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
];

// The app's languages, each by its own name (MO1.8.5 lists them that way).
// English and Arabic; French later (Round F, AV). Every area of the app is
// translated (Round G, EH final), so Arabic is no longer marked Beta.
export const APP_LANGUAGES: { code: "en" | "ar"; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية" },
];

export const languageEntry = (code: string) => APP_LANGUAGES.find((l) => l.code === code) ?? APP_LANGUAGES[0];

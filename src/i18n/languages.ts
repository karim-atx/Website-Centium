// The app's languages, each by its own name (MO1.8.5 lists them that way).
// English and Arabic; French later (Round F, AV). Arabic is marked Beta until
// every area of the app is translated (Karim, F7): a screen not yet translated
// shows its English inside the right-to-left layout.
export const APP_LANGUAGES: { code: "en" | "ar"; name: string; beta?: boolean }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "العربية", beta: true },
];

export const languageEntry = (code: string) => APP_LANGUAGES.find((l) => l.code === code) ?? APP_LANGUAGES[0];

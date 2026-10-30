import { addCatalogue, isCatalogueLoaded, type Language } from "./core";

// Round F (AV): a language's catalogue is a lazy chunk, fetched only when that
// language is chosen, so English's first load is unchanged.
export async function loadLanguage(l: Language): Promise<void> {
  if (isCatalogueLoaded(l)) return;
  if (l === "ar") addCatalogue("ar", (await import("./ar")).default);
}

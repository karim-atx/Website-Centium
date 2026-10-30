import { addCatalogue, addDocuments, isCatalogueLoaded, type Language } from "./core";

// Round F (AV): a language's catalogue is a lazy chunk, fetched only when that
// language is chosen, so English's first load is unchanged. The chunk also
// carries the long documents (the legal pages).
export async function loadLanguage(l: Language): Promise<void> {
  if (isCatalogueLoaded(l)) return;
  if (l === "ar") {
    const m = await import("./ar");
    addDocuments("ar", m.documents);
    addCatalogue("ar", m.default);
  }
}

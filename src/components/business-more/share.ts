/** Copies text; returns whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Shares a link with the Web Share API, falling back to copying it. */
export async function shareOrCopy(data: { title: string; text: string; url?: string; copy: string }): Promise<"shared" | "copied" | "failed" | "cancelled"> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: data.title, text: data.text, ...(data.url ? { url: data.url } : null) });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(data.copy)) ? "copied" : "failed";
}

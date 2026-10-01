// What a document card shows before the file is opened: a short type badge
// and a readable size. Kept apart from FileCard so that file exports only a
// component.

const BADGES: { test: RegExp; label: string; tone: string }[] = [
  { test: /pdf$/i, label: "PDF", tone: "bg-status-high-bg text-status-high" },
  { test: /(msword|wordprocessingml)|\.docx?$/i, label: "DOC", tone: "bg-primary-pale text-primary-deep-text" },
  { test: /(ms-excel|spreadsheetml)|\.xlsx?$|csv$/i, label: "XLS", tone: "bg-teal-pale text-teal-deep-text" },
  { test: /(ms-powerpoint|presentationml)|\.pptx?$/i, label: "PPT", tone: "bg-gold-pale text-charcoal" },
  { test: /text\/plain|\.txt$/i, label: "TXT", tone: "bg-cream-soft text-charcoal-soft" },
];

export function fileBadge(mime: string | null, name: string | null) {
  const key = `${mime ?? ""} ${name ?? ""}`;
  return BADGES.find((b) => b.test.test(mime ?? "") || b.test.test(name ?? "") || b.test.test(key)) ?? {
    label: "FILE",
    tone: "bg-cream-soft text-charcoal-soft",
  };
}

export function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

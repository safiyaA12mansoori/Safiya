export function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function pageRequest(raw: string | undefined, limit = 50): { page: number; offset: number; limit: number } {
  const parsed = Number(raw ?? "1");
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  return { page, offset: (page - 1) * limit, limit };
}

export function listUrl(
  path: string,
  options: { offset: number; limit?: number; q?: string; companyId?: string; recordType?: string },
): string {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 50));
  params.set("offset", String(options.offset));
  if (options.q) params.set("q", options.q);
  if (options.companyId) params.set("companyId", options.companyId);
  if (options.recordType) params.set("recordType", options.recordType);
  return `${path}?${params.toString()}`;
}

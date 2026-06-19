// Helpers for the TEXT-encoded JSON columns in the SQLite schema.

export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export function parseObject<T extends Record<string, unknown>>(
  value: string | null | undefined,
  fallback: T,
): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

export function stringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

// Split a comma / newline separated textarea value into a clean string list.
export function splitToList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

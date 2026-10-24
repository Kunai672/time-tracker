/**
 * Id generation with a deterministic fallback for environments without
 * `crypto.randomUUID`.
 */
export function newId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

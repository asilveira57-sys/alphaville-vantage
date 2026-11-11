export const BLOCKED_REVIEW = "bloqueado_manual";
export function isPropertyBlocked(row: { review_status?: unknown; manual_overrides?: unknown }) {
  const overrides = row.manual_overrides;
  return row.review_status === BLOCKED_REVIEW || (typeof overrides === "object" && overrides !== null && "blocked" in overrides && overrides.blocked === true);
}
export function canSyncProperty(row: { status: string; review_status?: unknown; manual_overrides?: unknown }) {
  return !isPropertyBlocked(row) && (row.status !== "inactive" && row.status !== "sold" || row.status === "inactive" && row.review_status === "saiu_da_api");
}
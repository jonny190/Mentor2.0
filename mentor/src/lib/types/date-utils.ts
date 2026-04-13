/**
 * Convert an ISO timestamp string to a local-date YYYY-MM-DD key.
 *
 * We store slot dates as DateTime in Prisma, which round-trips through UTC.
 * When a user picks "14 Apr" in a local timezone ahead of UTC, the stored
 * time ends up on "13 Apr" UTC. Slicing the UTC ISO string puts slots on the
 * wrong day in the local view, so we convert to local date instead.
 */
export function isoToLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

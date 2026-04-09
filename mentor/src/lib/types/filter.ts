export type FilterData = {
  id: number;
  name: string;
  impFilter: string;
  urgFilter: string;
  sizFilter: string;
  staFilter: string;
  schFilter: string;
  ctxFilter: string;
  flgFilter: string;
  userId: number;
};

export type FilterField = keyof Omit<FilterData, "id" | "name" | "userId">;

/**
 * Parse a comma-separated filter string into an array of numbers.
 * Empty string means "no filter" (show all).
 */
export function parseFilterValues(filterStr: string): number[] {
  if (!filterStr.trim()) return [];
  return filterStr.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

/**
 * Build a Prisma WHERE condition from filter data.
 * Empty filter fields are omitted (no restriction).
 */
export function buildFilterWhere(filter: FilterData): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  const impVals = parseFilterValues(filter.impFilter);
  if (impVals.length > 0) where.importance = { in: impVals };

  const urgVals = parseFilterValues(filter.urgFilter);
  if (urgVals.length > 0) where.urgency = { in: urgVals };

  const sizVals = parseFilterValues(filter.sizFilter);
  if (sizVals.length > 0) where.size = { in: sizVals };

  const staVals = parseFilterValues(filter.staFilter);
  if (staVals.length > 0) where.status = { in: staVals };

  const schVals = parseFilterValues(filter.schFilter);
  if (schVals.length > 0) where.schedule = { in: schVals };

  const ctxVals = parseFilterValues(filter.ctxFilter);
  if (ctxVals.length > 0) where.contextId = { in: ctxVals };

  const flgVals = parseFilterValues(filter.flgFilter);
  if (flgVals.length > 0) {
    where.OR = flgVals.map((flag) => ({
      flags: { not: 0 },
      AND: [{ flags: { gte: flag } }],
    }));
  }

  return where;
}

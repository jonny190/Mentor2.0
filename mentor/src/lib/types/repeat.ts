export const RepeatType = {
  NONE: 0,
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY_DATE: 3,
  MONTHLY_DAY: 4,
  YEARLY_DATE: 5,
  YEARLY_DAY: 6,
} as const;

export const RepeatTypeLabels: Record<number, string> = {
  0: "No repeat",
  1: "Daily",
  2: "Weekly",
  3: "Monthly (by date)",
  4: "Monthly (by day)",
  5: "Yearly (by date)",
  6: "Yearly (by day)",
};

export const RepeatPriority = {
  RECESSIVE: 0,
  NORMAL: 1,
  DOMINANT: 2,
} as const;

export const RepeatPriorityLabels: Record<number, string> = {
  0: "Recessive",
  1: "Normal",
  2: "Dominant",
};

export type RepeatPatternData = {
  id: number;
  slotId: number;
  type: number;
  intervalVal: number;
  dateTo: string | null;
  dateFrom: string;
  occurrences: number;
  flags: number;
  priority: number;
  pattern: string;
  userId: number;
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

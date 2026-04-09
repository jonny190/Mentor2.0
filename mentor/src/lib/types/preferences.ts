export type UserPrefs = {
  toolbar: boolean;
  buttonBar: boolean;
  cursorStyle: "highlight" | "underline";
  pathInHeader: boolean;
  pathInTasks: boolean;
  indentGoals: boolean;
  dueNumerals: boolean;
  rvRows: 1 | 2 | 3;
  treeCalc: boolean;
  asapDays: number;
  soonDays: number;
  sometimeDays: number;
  autoSchedule: boolean;
  incrementalReschedule: boolean;
  suggestAheadDays: number;
  scanAheadDays: number;
  fullDay: boolean;
  sizeMinutes: number;
  sizeHour: number;
  sizeHalfDay: number;
  sizeDay: number;
  zeroDropped: boolean;
  zeroDeferred: boolean;
  zeroDelegated: boolean;
  zoom: "small" | "medium" | "large";
};

export const DEFAULT_PREFERENCES: UserPrefs = {
  toolbar: true,
  buttonBar: true,
  cursorStyle: "highlight",
  pathInHeader: true,
  pathInTasks: false,
  indentGoals: true,
  dueNumerals: false,
  rvRows: 3,
  treeCalc: true,
  asapDays: 1,
  soonDays: 7,
  sometimeDays: 30,
  autoSchedule: false,
  incrementalReschedule: true,
  suggestAheadDays: 90,
  scanAheadDays: 30,
  fullDay: false,
  sizeMinutes: 15,
  sizeHour: 60,
  sizeHalfDay: 240,
  sizeDay: 480,
  zeroDropped: false,
  zeroDeferred: false,
  zeroDelegated: false,
  zoom: "medium",
};

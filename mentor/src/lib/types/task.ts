export const TaskType = {
  SIMPLE: 0,
  COMPOSITE: 1,
} as const;

export const TaskStatus = {
  ACTIVE: 0,
  DONE: 1,
  DROPPED: 2,
  DEFERRED: 3,
  DELEGATED: 4,
} as const;

export const TaskSize = {
  UNDEFINED: 0,
  MINUTES: 1,
  HOUR: 2,
  HALF_DAY: 3,
  DAY: 4,
  CUSTOM: 5,
} as const;

export const TaskFlags = {
  BOLD: 1,
  CROSSED_OUT: 2,
  ALARM: 4,
  ARCHIVE: 8,
} as const;

export const TaskSizeLabels: Record<number, string> = {
  0: "Undefined",
  1: "Minutes",
  2: "Hour",
  3: "Half Day",
  4: "Day",
  5: "Custom",
};

export const TaskStatusLabels: Record<number, string> = {
  0: "Active",
  1: "Done",
  2: "Dropped",
  3: "Deferred",
  4: "Delegated",
};

export type TaskWithChildren = {
  id: number;
  parentId: number | null;
  type: number;
  contextId: number | null;
  flags: number;
  importance: number;
  urgency: number;
  size: number;
  sizeCustom: number | null;
  status: number;
  schedule: number;
  dateEntered: string;
  dateUpdated: string;
  dateScheduled: string | null;
  dateDue: string | null;
  description: string;
  crossRef: string;
  stateText: string;
  notes: string;
  sortOrder: number;
  userId: number;
  children: { id: number }[];
  context: { id: number; name: string; symbolIcon: string } | null;
};

export type SlotQuery = {
  userId: number;
  contextId?: number;
  dateFrom: Date;
  dateTo: Date;
  minAvailable?: number;
};

export type TaskQuery = {
  userId: number;
  status?: number;
  scheduled?: boolean;
  slotId?: number;
};

export type SuggestOptions = {
  startDate?: Date;
  scanAheadDays: number;
  contextId?: number | null;
  sizeMinutes: number;
};

export type RescheduleScope = {
  userId: number;
  slotId?: number;
  taskIds?: number[];
};

export type RescheduleResult = {
  rescheduled: number;
  failed: number;
  details: { taskId: number; slotId: number | null; success: boolean }[];
};

export type CompleteOptions = {
  rescheduleMode: "this-slot" | "all-current";
};

export type SchedulerContext = {
  findSlots: (query: SlotQuery) => Promise<SlotWithCapacity[]>;
  findUnscheduledTasks: (query: TaskQuery) => Promise<SchedulableTask[]>;
  findTasksInSlot: (slotId: number, userId: number) => Promise<SchedulableTask[]>;
  assignTask: (taskId: number, slotId: number, userId: number) => Promise<void>;
  unassignTask: (taskId: number, userId: number) => Promise<void>;
  updateSlotCounts: (slotId: number, userId: number) => Promise<void>;
  updateTaskScheduleState: (taskId: number, data: { schedule: number; dateScheduled: Date | null }) => Promise<void>;
};

export type SlotWithCapacity = {
  id: number;
  contextId: number | null;
  dateScheduled: Date;
  startMinutes: number;
  endMinutes: number;
  allocated: number;
  overallAlloc: number;
  description: string;
  userId: number;
  remainingCapacity: number;
};

export type SchedulableTask = {
  id: number;
  contextId: number | null;
  size: number;
  sizeCustom: number | null;
  status: number;
  schedule: number;
  dateScheduled: Date | null;
  dateDue: Date | null;
  description: string;
  userId: number;
};

export const ScheduleState = {
  UNSCHEDULED: 0,
  SCHEDULED: 1,
  PARTIALLY_SCHEDULED: 2,
} as const;

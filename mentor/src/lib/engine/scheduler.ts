import {
  SchedulerContext,
  SlotWithCapacity,
  SchedulableTask,
  SuggestOptions,
  ScheduleState,
} from "./types";

export function taskSizeToMinutes(
  size: number,
  sizeCustom: number | null,
  prefs: { sizeMinutes: number; sizeHour: number; sizeHalfDay: number; sizeDay: number }
): number {
  switch (size) {
    case 1: return prefs.sizeMinutes;
    case 2: return prefs.sizeHour;
    case 3: return prefs.sizeHalfDay;
    case 4: return prefs.sizeDay;
    case 5: return sizeCustom ?? prefs.sizeHour;
    default: return 0;
  }
}

export async function suggestSlot(
  ctx: SchedulerContext,
  task: SchedulableTask,
  options: SuggestOptions
): Promise<SlotWithCapacity | null> {
  const startDate = options.startDate ?? new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + options.scanAheadDays);

  const slots = await ctx.findSlots({
    userId: task.userId,
    contextId: options.contextId ?? undefined,
    dateFrom: startDate,
    dateTo: endDate,
    minAvailable: options.sizeMinutes,
  });

  for (const slot of slots) {
    if (slot.remainingCapacity >= options.sizeMinutes) {
      if (options.contextId === null || options.contextId === undefined || slot.contextId === options.contextId) {
        return slot;
      }
    }
  }

  if (options.contextId !== null && options.contextId !== undefined) {
    for (const slot of slots) {
      if (slot.remainingCapacity >= options.sizeMinutes) {
        return slot;
      }
    }
  }

  return null;
}

export async function scheduleTask(
  ctx: SchedulerContext,
  taskId: number,
  slotId: number,
  userId: number
): Promise<void> {
  await ctx.assignTask(taskId, slotId, userId);
  await ctx.updateSlotCounts(slotId, userId);
  await ctx.updateTaskScheduleState(taskId, {
    schedule: ScheduleState.SCHEDULED,
    dateScheduled: new Date(),
  });
}

export async function unscheduleTask(
  ctx: SchedulerContext,
  taskId: number,
  userId: number
): Promise<void> {
  await ctx.unassignTask(taskId, userId);
  await ctx.updateTaskScheduleState(taskId, {
    schedule: ScheduleState.UNSCHEDULED,
    dateScheduled: null,
  });
}

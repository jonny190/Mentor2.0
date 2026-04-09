import {
  SchedulerContext,
  RescheduleScope,
  RescheduleResult,
  CompleteOptions,
} from "./types";
import { suggestSlot, scheduleTask, unscheduleTask, taskSizeToMinutes } from "./scheduler";

const DEFAULT_SIZE_PREFS = {
  sizeMinutes: 15,
  sizeHour: 60,
  sizeHalfDay: 240,
  sizeDay: 480,
};

export async function reschedule(
  ctx: SchedulerContext,
  mode: "incremental" | "full",
  scope: RescheduleScope,
  sizePrefs = DEFAULT_SIZE_PREFS,
  scanAheadDays = 30
): Promise<RescheduleResult> {
  const result: RescheduleResult = { rescheduled: 0, failed: 0, details: [] };

  let tasks;
  if (mode === "incremental" && scope.slotId) {
    tasks = await ctx.findTasksInSlot(scope.slotId, scope.userId);
    tasks = tasks.filter((t) => t.status === 0);
  } else if (mode === "incremental" && scope.taskIds) {
    tasks = await ctx.findUnscheduledTasks({
      userId: scope.userId,
      status: 0,
      scheduled: false,
    });
    tasks = tasks.filter((t) => scope.taskIds!.includes(t.id));
  } else {
    tasks = await ctx.findUnscheduledTasks({
      userId: scope.userId,
      status: 0,
      scheduled: false,
    });
  }

  for (const task of tasks) {
    const sizeMinutes = taskSizeToMinutes(task.size, task.sizeCustom, sizePrefs);
    if (sizeMinutes === 0) {
      result.details.push({ taskId: task.id, slotId: null, success: false });
      result.failed++;
      continue;
    }

    const slot = await suggestSlot(ctx, task, {
      sizeMinutes,
      scanAheadDays,
      contextId: task.contextId,
    });

    if (slot) {
      await scheduleTask(ctx, task.id, slot.id, scope.userId);
      result.details.push({ taskId: task.id, slotId: slot.id, success: true });
      result.rescheduled++;
    } else {
      result.details.push({ taskId: task.id, slotId: null, success: false });
      result.failed++;
    }
  }

  return result;
}

export async function completeSlot(
  ctx: SchedulerContext,
  slotId: number,
  userId: number,
  options: CompleteOptions,
  sizePrefs = DEFAULT_SIZE_PREFS,
  scanAheadDays = 30
): Promise<RescheduleResult> {
  const tasks = await ctx.findTasksInSlot(slotId, userId);
  const activeTasks = tasks.filter((t) => t.status === 0);

  for (const task of activeTasks) {
    await unscheduleTask(ctx, task.id, userId);
  }

  if (options.rescheduleMode === "this-slot") {
    return reschedule(ctx, "incremental", {
      userId,
      taskIds: activeTasks.map((t) => t.id),
    }, sizePrefs, scanAheadDays);
  } else {
    return reschedule(ctx, "full", { userId }, sizePrefs, scanAheadDays);
  }
}

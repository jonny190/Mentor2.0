export type TimeSlotWithContext = {
  id: number;
  type: number;
  contextId: number | null;
  dateScheduled: string;
  startMinutes: number;
  endMinutes: number;
  allocated: number;
  scheduled: number;
  count: number;
  overallAlloc: number;
  description: string;
  userId: number;
  context: { id: number; name: string; symbolIcon: string } | null;
  taskAssignments: {
    id: number;
    task: {
      id: number;
      description: string;
      status: number;
      size: number;
    };
  }[];
};

export const SlotType = {
  REGULAR: 0,
  APPOINTMENT: 1,
  MILESTONE: 2,
} as const;

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function slotDurationMinutes(slot: { startMinutes: number; endMinutes: number }): number {
  return slot.endMinutes - slot.startMinutes;
}

import { create } from "zustand";

type RoleStore = {
  weekOffset: number;
  weeksToShow: 1 | 2 | 3;
  selectedCell: { contextId: number; date: string } | null;
  setWeekOffset: (offset: number) => void;
  goForwardWeek: () => void;
  goBackWeek: () => void;
  goToCurrentWeek: () => void;
  setWeeksToShow: (weeks: 1 | 2 | 3) => void;
  setSelectedCell: (cell: { contextId: number; date: string } | null) => void;
};

export const useRoleStore = create<RoleStore>((set) => ({
  weekOffset: 0,
  weeksToShow: 3,
  selectedCell: null,
  setWeekOffset: (offset) => set({ weekOffset: offset }),
  goForwardWeek: () => set((s) => ({ weekOffset: s.weekOffset + 1 })),
  goBackWeek: () => set((s) => ({ weekOffset: s.weekOffset - 1 })),
  goToCurrentWeek: () => set({ weekOffset: 0 }),
  setWeeksToShow: (weeks) => set({ weeksToShow: weeks }),
  setSelectedCell: (cell) => set({ selectedCell: cell }),
}));

export function getWeekStart(weekOffset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getVisibleDates(weekOffset: number, weeksToShow: number): string[] {
  const start = getWeekStart(weekOffset);
  const dates: string[] = [];
  for (let i = 0; i < weeksToShow * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

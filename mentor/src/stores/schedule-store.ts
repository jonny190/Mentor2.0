import { create } from "zustand";

type ScheduleStore = {
  currentDate: Date;
  selectedSlotId: number | null;
  setCurrentDate: (date: Date) => void;
  goToToday: () => void;
  goForward: (days: number) => void;
  goBack: (days: number) => void;
  setSelectedSlot: (id: number | null) => void;
};

export const useScheduleStore = create<ScheduleStore>((set) => ({
  currentDate: new Date(),
  selectedSlotId: null,
  setCurrentDate: (date) => set({ currentDate: date }),
  goToToday: () => set({ currentDate: new Date() }),
  goForward: (days) =>
    set((state) => {
      const next = new Date(state.currentDate);
      next.setDate(next.getDate() + days);
      return { currentDate: next };
    }),
  goBack: (days) =>
    set((state) => {
      const prev = new Date(state.currentDate);
      prev.setDate(prev.getDate() - days);
      return { currentDate: prev };
    }),
  setSelectedSlot: (id) => set({ selectedSlotId: id }),
}));

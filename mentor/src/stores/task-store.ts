import { create } from "zustand";

type TaskStore = {
  selectedTaskId: number | null;
  currentParentId: number | null;
  parentPath: { id: number; description: string }[];
  setSelectedTask: (id: number | null) => void;
  navigateInto: (taskId: number, description: string) => void;
  navigateUp: () => void;
  navigateToRoot: () => void;
  navigateTo: (index: number) => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  selectedTaskId: null,
  currentParentId: null,
  parentPath: [],
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  navigateInto: (taskId, description) =>
    set((state) => ({
      currentParentId: taskId,
      parentPath: [...state.parentPath, { id: taskId, description }],
      selectedTaskId: null,
    })),
  navigateUp: () =>
    set((state) => {
      const newPath = state.parentPath.slice(0, -1);
      return {
        currentParentId: newPath.length > 0 ? newPath[newPath.length - 1].id : null,
        parentPath: newPath,
        selectedTaskId: null,
      };
    }),
  navigateToRoot: () =>
    set({ currentParentId: null, parentPath: [], selectedTaskId: null }),
  navigateTo: (index) =>
    set((state) => {
      const newPath = state.parentPath.slice(0, index + 1);
      return {
        currentParentId: newPath.length > 0 ? newPath[newPath.length - 1].id : null,
        parentPath: newPath,
        selectedTaskId: null,
      };
    }),
}));

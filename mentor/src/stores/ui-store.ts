import { create } from "zustand";

export type UndoableAction = {
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

type UiStore = {
  zoom: "small" | "medium" | "large";
  setZoom: (zoom: "small" | "medium" | "large") => void;
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
  pushUndo: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export const useUiStore = create<UiStore>((set, get) => ({
  zoom: "medium",
  setZoom: (zoom) => set({ zoom }),
  undoStack: [],
  redoStack: [],
  pushUndo: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack, action],
      redoStack: [],
    })),
  undo: async () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    await action.undo();
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, action],
    });
  },
  redo: async () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    await action.redo();
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, action],
    });
  },
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));

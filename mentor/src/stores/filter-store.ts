import { create } from "zustand";

type FilterStore = {
  activeFilterId: number | null;
  setActiveFilter: (id: number | null) => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  activeFilterId: null,
  setActiveFilter: (id) => set({ activeFilterId: id }),
}));

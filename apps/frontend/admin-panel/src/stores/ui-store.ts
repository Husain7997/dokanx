import { create } from "zustand";

type UiStore = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (sidebarCollapsed: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed })
}));

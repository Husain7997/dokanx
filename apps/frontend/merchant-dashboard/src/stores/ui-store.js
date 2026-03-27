import { create } from "zustand";
export const useUiStore = create((set) => ({
    sidebarOpen: true,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen })
}));

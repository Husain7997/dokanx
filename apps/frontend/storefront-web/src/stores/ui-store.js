import { create } from "zustand";
export const useUiStore = create((set) => ({
    isMobileNavOpen: false,
    setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen })
}));

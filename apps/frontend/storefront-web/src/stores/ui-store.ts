import { create } from "zustand";

type UiStore = {
  isMobileNavOpen: boolean;
  setMobileNavOpen: (isOpen: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  isMobileNavOpen: false,
  setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen })
}));

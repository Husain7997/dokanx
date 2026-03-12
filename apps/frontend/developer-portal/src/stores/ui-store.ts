import { create } from "zustand";

type UiStore = {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (commandPaletteOpen: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen })
}));

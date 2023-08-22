import { StateCreator } from "zustand";

type ZoomLevel = 1 | 2 | 3;

interface UserProfileSlice {
  lendZoomLevel: ZoomLevel;
  denominationUSD: boolean;
  showBadges: boolean;
  setLendZoomLevel: (level: ZoomLevel) => void;
  setDenominationUSD: (checked: boolean) => void;
  setShowBadges: (checked: boolean) => void;
}

const createUserProfileSlice: StateCreator<UserProfileSlice, [], [], UserProfileSlice> = (set) => ({
  lendZoomLevel: 3,
  denominationUSD: false,
  showBadges: false,
  setLendZoomLevel: (level: ZoomLevel) => set(() => ({ lendZoomLevel: level })),
  setDenominationUSD: (checked: boolean) => set(() => ({ denominationUSD: checked })),
  setShowBadges: (checked: boolean) => set(() => ({ showBadges: checked })),
});

export { createUserProfileSlice };
export type { ZoomLevel, UserProfileSlice };

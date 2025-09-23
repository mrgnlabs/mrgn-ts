import { DEFAULT_USER_POINTS_DATA, UserPointsData } from "@mrgnlabs/mrgn-state";
import { create } from "zustand";

type ZoomLevel = 1 | 2 | 3;

interface UserProfileState {
  // State
  lendZoomLevel: ZoomLevel;
  showBadges: boolean;
  userPointsData: UserPointsData;

  // Actions
  setLendZoomLevel: (level: ZoomLevel) => void;
  setShowBadges: (checked: boolean) => void;
}

function createUserProfileStore() {
  return create<UserProfileState>()((set) => ({
    // State
    lendZoomLevel: 3,
    showBadges: false,
    userPointsData: DEFAULT_USER_POINTS_DATA,

    // Actions
    setLendZoomLevel: (level: ZoomLevel) => set(() => ({ lendZoomLevel: level })),
    setShowBadges: (checked: boolean) => set(() => ({ showBadges: checked })),
  }));
}

export { createUserProfileStore };
export type { ZoomLevel, UserProfileState };

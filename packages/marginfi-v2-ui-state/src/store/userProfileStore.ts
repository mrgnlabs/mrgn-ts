import { User, signOut } from "firebase/auth";
import { create } from "zustand";
import { firebaseApi } from "../lib";
import { DEFAULT_USER_POINTS_DATA, UserPointsData, getPointsDataForUser } from "../lib/points";

type ZoomLevel = 1 | 2 | 3;

interface UserProfileState {
  // State
  lendZoomLevel: ZoomLevel;
  denominationUSD: boolean;
  showBadges: boolean;
  currentFirebaseUser: User | null;
  hasUser: boolean | null;
  userPointsData: UserPointsData;

  // Actions
  setLendZoomLevel: (level: ZoomLevel) => void;
  setDenominationUSD: (checked: boolean) => void;
  setShowBadges: (checked: boolean) => void;
  checkForFirebaseUser: (walletAddress: string) => Promise<void>;
  setFirebaseUser: (user: User | null) => void;
  signoutFirebaseUser: (isConnected: boolean, walletAddress?: string) => Promise<void>;
  fetchPoints: (walletAddress: string) => Promise<void>;
  resetPoints: () => void;
}

function createUserProfileStore() {
  return create<UserProfileState>()((set, get) => ({
    // State
    lendZoomLevel: 3,
    denominationUSD: false,
    showBadges: false,
    currentFirebaseUser: null,
    hasUser: null,
    userPointsData: DEFAULT_USER_POINTS_DATA,

    // Actions
    setLendZoomLevel: (level: ZoomLevel) => set(() => ({ lendZoomLevel: level })),
    setDenominationUSD: (checked: boolean) => set(() => ({ denominationUSD: checked })),
    setShowBadges: (checked: boolean) => set(() => ({ showBadges: checked })),
    checkForFirebaseUser: async (walletAddress: string) => {
      let user;
      try {
        user = await firebaseApi.getUser(walletAddress);
      } catch (error: any) {}

      set({ hasUser: !!user });
    },
    setFirebaseUser: (user: User | null) => {
      set(() => ({ currentFirebaseUser: user }));
    },
    signoutFirebaseUser: async (isConnected: boolean, walletAddress?: string) => {
      const currentFirebaseUser = get().currentFirebaseUser;

      const disconnected = !isConnected && currentFirebaseUser;
      const mismatchingId = walletAddress && currentFirebaseUser?.uid && walletAddress !== currentFirebaseUser.uid;
      if (disconnected || mismatchingId) {
        await signOut(firebaseApi.auth);
        set(() => ({ currentFirebaseUser: null }));
      }
    },
    fetchPoints: async (wallet: string) => set({ userPointsData: await getPointsDataForUser(wallet) }),
    resetPoints: () => set({ userPointsData: DEFAULT_USER_POINTS_DATA }),
  }));
}

export { createUserProfileStore };
export type { ZoomLevel, UserProfileState };

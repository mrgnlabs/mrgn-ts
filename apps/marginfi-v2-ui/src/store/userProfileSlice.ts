import { User, signOut } from "firebase/auth";
import { StateCreator } from "zustand";
import { firebaseApi } from "~/api";
import { firebaseAuth } from "~/api/firebase";
import { getPoints } from "~/api/points";

type ZoomLevel = 1 | 2 | 3;

interface UserPointsSummary {
  deposit_points: number;
  borrow_points: number;
  total: number;
}

const DEFAULT_USER_POINTS_SUMMARY: UserPointsSummary = {
  deposit_points: 0,
  borrow_points: 0,
  total: 0,
};

interface UserProfileSlice {
  // State
  lendZoomLevel: ZoomLevel;
  denominationUSD: boolean;
  showBadges: boolean;
  currentFirebaseUser: User | null;
  hasUser: boolean | null;
  pointsSummary: UserPointsSummary;

  // Actions
  setLendZoomLevel: (level: ZoomLevel) => void;
  setDenominationUSD: (checked: boolean) => void;
  setShowBadges: (checked: boolean) => void;
  checkForFirebaseUser: (walletAddress: string) => Promise<void>;
  setFirebaseUser: (user: User | null) => void;
  signoutFirebaseUser: (isConnected: boolean, walletAddress?: string) => Promise<void>;
  fetchPoints: (walletAddress: string) => Promise<void>;
}

const createUserProfileSlice: StateCreator<UserProfileSlice, [], [], UserProfileSlice> = (set, get) => ({
  // State
  lendZoomLevel: 3,
  denominationUSD: false,
  showBadges: false,
  currentFirebaseUser: null,
  hasUser: null,
  pointsSummary: DEFAULT_USER_POINTS_SUMMARY,

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
  setFirebaseUser: (user: User | null) => set(() => ({ currentFirebaseUser: user })),
  signoutFirebaseUser: async (isConnected: boolean, walletAddress?: string) => {
    const currentFirebaseUser = get().currentFirebaseUser;

    const disconnected = !isConnected && currentFirebaseUser;
    const mismatchingId = walletAddress && currentFirebaseUser?.uid && walletAddress !== currentFirebaseUser.uid;
    if (disconnected || mismatchingId) {
      await signOut(firebaseAuth);
      set(() => ({ currentFirebaseUser: null }));
    }
  },
  fetchPoints: async (wallet: string) => set({ pointsSummary: await getPoints({ wallet }) }),
});

export { createUserProfileSlice };
export type { ZoomLevel, UserProfileSlice };

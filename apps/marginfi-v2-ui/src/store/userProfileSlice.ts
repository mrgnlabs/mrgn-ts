import { User, signOut } from "firebase/auth";
import { StateCreator } from "zustand";
import { firebaseApi } from "~/api";
import { firebaseAuth } from "~/api/firebase";

type ZoomLevel = 1 | 2 | 3;

interface UserProfileSlice {
  // State
  lendZoomLevel: ZoomLevel;
  denominationUSD: boolean;
  showBadges: boolean;
  currentFirebaseUser: User | null;
  hasUser: boolean | null;

  // Actions
  setLendZoomLevel: (level: ZoomLevel) => void;
  setDenominationUSD: (checked: boolean) => void;
  setShowBadges: (checked: boolean) => void;
  checkForFirebaseUser: (walletAddress: string) => Promise<void>;
  setFirebaseUser: (user: User | null) => void;
  signoutFirebaseUser: (isConnected: boolean, walletAddress?: string) => Promise<void>;
}

const createUserProfileSlice: StateCreator<UserProfileSlice, [], [], UserProfileSlice> = (set, get) => ({
  // State
  lendZoomLevel: 3,
  denominationUSD: false,
  showBadges: false,
  currentFirebaseUser: null,
  hasUser: null,

  // Actions
  setLendZoomLevel: (level: ZoomLevel) => set(() => ({ lendZoomLevel: level })),
  setDenominationUSD: (checked: boolean) => set(() => ({ denominationUSD: checked })),
  setShowBadges: (checked: boolean) => set(() => ({ showBadges: checked })),
  checkForFirebaseUser: async (walletAddress: string) => {
    console.log("checking")
    let user;
    try {
      user = await firebaseApi.getUser(walletAddress);
    } catch (error: any) {}

    set({ hasUser: !!user });
  },
  setFirebaseUser: (user: User | null) => {
    console.log("setting")
    
    set(() => ({ currentFirebaseUser: user }))},
  signoutFirebaseUser: async (isConnected: boolean, walletAddress?: string) => {
    console.log("signout")
    const currentFirebaseUser = get().currentFirebaseUser;

    const disconnected = !isConnected;
    const mismatchingId = walletAddress && currentFirebaseUser?.uid && walletAddress !== currentFirebaseUser.uid;
    if (disconnected || mismatchingId) {
      await signOut(firebaseAuth);
      set(() => ({ currentFirebaseUser: null }));
    }
  },
});

export { createUserProfileSlice };
export type { ZoomLevel, UserProfileSlice };

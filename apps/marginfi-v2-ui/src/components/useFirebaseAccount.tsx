import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useUserProfileStore } from "~/store";
import { useWalletContext } from "./useWalletContext";

const useFirebaseAccount = () => {
  const {connected, walletAddress} = useWalletContext();

  const [checkForFirebaseUser, setFirebaseUser, signoutFirebaseUser, fetchPoints, resetPoints] = useUserProfileStore(
    (state) => [
      state.checkForFirebaseUser,
      state.setFirebaseUser,
      state.signoutFirebaseUser,
      state.fetchPoints,
      state.resetPoints,
    ]
  );

  useEffect(() => {
    // NOTE: if more point-specific logic is added, move this to a separate hook
    const unsubscribe = onAuthStateChanged(firebaseApi.auth, (newUser) => {
      if (newUser) {
        fetchPoints(newUser.uid).catch(console.error);
        setFirebaseUser(newUser);
      } else {
        resetPoints();
        setFirebaseUser(null);
      }
    });
    return () => unsubscribe();
  }, [fetchPoints, setFirebaseUser, resetPoints]);

  // Wallet connection side effect (auto-login attempt)
  useEffect(() => {
    if (!walletAddress) return;
    checkForFirebaseUser(walletAddress.toBase58());
  }, [walletAddress, checkForFirebaseUser]);

  // Wallet disconnection/change side effect (auto-logout)
  useEffect(() => {
    signoutFirebaseUser(connected, walletAddress?.toBase58()).catch((error) =>
      toast.error(`Error signing out: ${error}`)
    ),
      [connected, walletAddress];
  });
};

export { useFirebaseAccount };

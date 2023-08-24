import { firebaseAuth } from "@mrgnlabs/marginfi-v2-ui-state";
import { useWallet } from "@solana/wallet-adapter-react";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useUserProfileStore } from "~/store";

const useFirebaseAccount = () => {
  const wallet = useWallet();
  
  const [checkForFirebaseUser, setFirebaseUser, signoutFirebaseUser, fetchPoints, resetPoints] = useUserProfileStore((state) => [
    state.checkForFirebaseUser,
    state.setFirebaseUser,
    state.signoutFirebaseUser,
    state.fetchPoints,
    state.resetPoints,
  ]);

  useEffect(() => {
    // NOTE: if more point-specific logic is added, move this to a separate hook
    const unsubscribe = onAuthStateChanged(firebaseAuth, (newUser) => {
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
    if (!wallet.publicKey) return;
    checkForFirebaseUser(wallet.publicKey.toBase58());
  }, [wallet.publicKey, checkForFirebaseUser]);

  // Wallet disconnection/change side effect (auto-logout)
  useEffect(() => {
    signoutFirebaseUser(wallet.connected, wallet.publicKey?.toBase58()).catch((error) =>
      toast.error(`Error signing out: ${error}`)
    ),
      [wallet];
  });
};

export { useFirebaseAccount };

import { useWallet } from "@solana/wallet-adapter-react";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { firebaseAuth } from "~/api/firebase";
import { useStore } from "~/store";

const useFirebaseAccount = () => {
  const wallet = useWallet();
  const [checkForFirebaseUser, setFirebaseUser, signoutFirebaseUser] = useStore((state) => [
    state.checkForFirebaseUser,
    state.setFirebaseUser,
    state.signoutFirebaseUser,
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (newUser) => setFirebaseUser(newUser));
    return () => unsubscribe();
  }, [setFirebaseUser]);

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

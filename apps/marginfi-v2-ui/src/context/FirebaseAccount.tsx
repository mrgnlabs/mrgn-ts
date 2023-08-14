import { useWallet } from "@solana/wallet-adapter-react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import React, { useCallback, useEffect, useState } from "react";
import { FC, createContext, useContext } from "react";
import { toast } from "react-toastify";
import { firebaseApi } from "~/api";
import { firebaseAuth } from "~/api/firebase";
import { UserData } from "~/pages/api/user/get";

// @ts-ignore - Safe because context hook checks for null
const FirebaseAccountContext = createContext<FirebaseAccountState>();

interface FirebaseAccountState {
  currentUser: User | null;
  existingUser: UserData | null;
  initialUserFetchDone: boolean;
}

const FirebaseAccountProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const wallet = useWallet();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [existingUser, setExistingUser] = useState<UserData | null>(null);
  const [initialUserFetchDone, setInitialUserFetchDone] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      console.log("auth changed:", currentUser?.uid);
      setCurrentUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const checkForUser = useCallback(async (walletAddress: string) => {
    let user;
    try {
      user = await firebaseApi.getUser(walletAddress);
    } catch (error: any) {}

    setExistingUser(user ?? null);
    setInitialUserFetchDone(true);
  }, []);

  // Wallet connection side effect (auto-login attempt)
  useEffect(() => {
    if (!wallet.publicKey) return;
    const walletAddress = wallet.publicKey.toBase58();
    
    checkForUser(walletAddress);
  }, [wallet.publicKey, checkForUser]);

  // Wallet disconnection/change side effect (auto-logout)
  useEffect(() => {
    (async function () {
      const disconnected = !wallet.connected;
      const mismatchingId = wallet.publicKey && currentUser?.uid && (wallet.publicKey.toBase58() !== currentUser.uid)
      if (disconnected || mismatchingId) {
        try {
          await signOut(firebaseAuth);
        } catch (error) {
          toast.error(`Error signing out: ${error}`);
        }
        return;
      }

      return;
    })(),
      [wallet];
  });

  return (
    <FirebaseAccountContext.Provider value={{ existingUser, currentUser, initialUserFetchDone }}>
      {children}
    </FirebaseAccountContext.Provider>
  );
};

const useFirebaseAccount = () => {
  const context = useContext(FirebaseAccountContext);
  if (!context) {
    throw new Error("useFirebaseAccount must be used within a FirebaseAccountProvider");
  }

  return context;
};

export { useFirebaseAccount, FirebaseAccountProvider };

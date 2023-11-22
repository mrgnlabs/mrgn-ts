import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { useRouter } from "next/router";

import { toast } from "react-toastify";
import { useUserProfileStore } from "~/store";
import { useWalletContext } from "./useWalletContext";
import React from "react";

const useFirebaseAccount = () => {
  const { connected, walletAddress } = useWalletContext();
  const { query: routerQuery } = useRouter();

  const referralCode = React.useMemo(() => routerQuery.referralCode as string | undefined, [routerQuery.referralCode]);

  const [checkForFirebaseUser, setFirebaseUser, signoutFirebaseUser, fetchPoints, resetPoints, hasUser] =
    useUserProfileStore((state) => [
      state.checkForFirebaseUser,
      state.setFirebaseUser,
      state.signoutFirebaseUser,
      state.fetchPoints,
      state.resetPoints,
      state.hasUser,
    ]);

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

    firebaseApi.loginOrSignup(walletAddress.toBase58(), referralCode).catch(console.error);
    checkForFirebaseUser(walletAddress.toBase58());
  }, [walletAddress, checkForFirebaseUser, referralCode]);

  // Wallet disconnection/change side effect (auto-logout)
  useEffect(() => {
    signoutFirebaseUser(connected, walletAddress?.toBase58()).catch((error) =>
      toast.error(`Error signing out: ${error}`)
    ),
      [connected, walletAddress];
  });
};

export { useFirebaseAccount };

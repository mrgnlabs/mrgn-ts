import { useWallet, WalletInfo } from "@mrgnlabs/mrgn-ui";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { useRouter } from "next/router";

import { useUserProfileStore } from "~/store";
import React from "react";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import { auth, loginOrSignup } from "@mrgnlabs/mrgn-state";

const useFirebaseAccount = () => {
  const { connected, walletAddress } = useWallet();
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

  const walletInfo = JSON.parse(localStorage.getItem("walletInfo") ?? "null") as WalletInfo;
  const walletId = walletInfo && walletInfo?.name ? walletInfo.name : "";

  useEffect(() => {
    // NOTE: if more point-specific logic is added, move this to a separate hook
    const unsubscribe = onAuthStateChanged(auth, (newUser) => {
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

    loginOrSignup(walletAddress.toBase58(), walletId, referralCode).catch(console.error);
    checkForFirebaseUser(walletAddress.toBase58());
  }, [walletAddress, checkForFirebaseUser, referralCode, walletId]);

  // Wallet disconnection/change side effect (auto-logout)
  useEffect(() => {
    signoutFirebaseUser(connected, walletAddress?.toBase58()).catch((error) =>
      toastManager.showErrorToast(`Error signing out: ${error}`)
    ),
      [connected, walletAddress];
  });
};

export { useFirebaseAccount };

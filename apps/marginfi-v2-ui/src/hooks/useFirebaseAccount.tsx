import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletInfo } from "~/components/wallet-v2/";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";

import { useUserProfileStore } from "~/store";
import { useMrgnlendStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import React from "react";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

const useFirebaseAccount = () => {
  const { connected, walletAddress } = useWallet();
  const { query: routerQuery } = useRouter();

  const [isLogged, setIsLogged] = React.useState(false);
  const referralCode = React.useMemo(() => routerQuery.referralCode as string | undefined, [routerQuery.referralCode]);

  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

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
    if (!initialized) return;
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
  }, [fetchPoints, setFirebaseUser, resetPoints, initialized]);

  // Wallet connection side effect (auto-login attempt)
  useEffect(() => {
    if (!walletAddress) return;

    firebaseApi.loginOrSignup(walletAddress.toBase58(), walletId, referralCode).catch(console.error);
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

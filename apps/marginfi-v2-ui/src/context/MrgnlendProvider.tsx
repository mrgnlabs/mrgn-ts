import React from "react";
import { useRouter } from "next/router";
import { identify } from "@mrgnlabs/mrgn-utils";

import { ActionBoxProvider, AuthDialog, useWallet } from "@mrgnlabs/mrgn-ui";
import { useUiStore } from "~/store";
import {
  useExtendedBanks,
  useMarginfiAccountAddresses,
  useMarginfiClient,
  useNativeStakeData,
  useUserBalances,
  useUserStakeAccounts,
  useWrappedMarginfiAccount,
  WalletStateProvider,
} from "@mrgnlabs/mrgn-state";

export const MrgnlendProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { wallet, walletAddress } = useWallet();

  const { extendedBanks } = useExtendedBanks();
  const { stakePoolMetadataMap } = useNativeStakeData();
  const { wrappedAccount: selectedAccount } = useWrappedMarginfiAccount(wallet);
  const { data: marginfiAccounts, isSuccess: isSuccessMarginfiAccounts } = useMarginfiAccountAddresses();
  const { data: userBalances } = useUserBalances();
  const { data: stakeAccounts } = useUserStakeAccounts();
  const { marginfiClient } = useMarginfiClient(wallet);

  const [fetchPriorityFee, fetchAccountLabels, accountLabels, setDisplaySettings] = useUiStore((state) => [
    state.fetchPriorityFee,
    state.fetchAccountLabels,
    state.accountLabels,
    state.setDisplaySettings,
  ]);

  const [hasFetchedAccountLabels, setHasFetchedAccountLabels] = React.useState(false);

  // identify user if logged in
  React.useEffect(() => {
    const walletAddress = wallet.publicKey?.toBase58();
    if (!walletAddress) return;
    identify(walletAddress, {
      wallet: walletAddress,
    });
  }, [wallet.publicKey]);

  // if account set in query param then store inn local storage and remove from url
  React.useEffect(() => {
    const { account } = router.query;
    if (!account) return;

    const prevMfiAccount = localStorage.getItem("mfiAccount");
    if (prevMfiAccount === account) return;

    localStorage.setItem("mfiAccount", account as string);
    router.replace(router.pathname, undefined, { shallow: true });
  }, [router.query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch account labels
  React.useEffect(() => {
    if (marginfiAccounts && marginfiAccounts.length > 0 && isSuccessMarginfiAccounts) {
      setHasFetchedAccountLabels(true);
      fetchAccountLabels(marginfiAccounts);
    }
  }, [marginfiAccounts, isSuccessMarginfiAccounts, fetchAccountLabels]);

  return (
    <WalletStateProvider walletAddress={walletAddress}>
      <ActionBoxProvider
        banks={extendedBanks}
        nativeSolBalance={userBalances?.nativeSolBalance ?? 0}
        marginfiClient={marginfiClient ?? null}
        selectedAccount={selectedAccount}
        connected={false}
        setDisplaySettings={setDisplaySettings}
        stakePoolMetadataMap={stakePoolMetadataMap}
        stakeAccounts={stakeAccounts ?? []}
      >
        {children}

        <AuthDialog
          mrgnState={{
            marginfiClient: marginfiClient ?? null,
            selectedAccount,
            extendedBankInfos: extendedBanks,
            nativeSolBalance: userBalances?.nativeSolBalance ?? 0,
          }}
        />
      </ActionBoxProvider>
    </WalletStateProvider>
  );
};

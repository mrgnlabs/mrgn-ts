import { useMarginfiAccountAddresses } from "@mrgnlabs/mrgn-state";

import { useWallet } from "~/components";

export const useHasMrgnAcct = (): boolean => {
  const { walletAddress } = useWallet();
  const { data: marginfiAccounts } = useMarginfiAccountAddresses(walletAddress);

  return !!marginfiAccounts && marginfiAccounts.length > 0;
};

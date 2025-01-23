import React from "react";
import { ActionBox as ActionBoxV2 } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";

import { Loader } from "~/components/ui/loader";
import { useWallet } from "~/components/wallet-v2";

export default function DepositSwapPage() {
  const [initialized, extendedBankInfosWithoutStakedAssets] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfosWithoutStakedAssets,
  ]);
  const { connected } = useWallet();

  return (
    <>
      {!initialized && <Loader label="Loading marginfi..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading heading="✨ Deposit Swap" body={<p>Swap any token and deposit in your chosen collateral.</p>} />
          <ActionBoxV2.DepositSwap
            useProvider={true}
            depositSwapProps={{
              banks: extendedBankInfosWithoutStakedAssets,
              connected: connected,
              requestedDepositBank: undefined,
              requestedSwapBank: undefined,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
            }}
          />
        </div>
      )}
    </>
  );
}

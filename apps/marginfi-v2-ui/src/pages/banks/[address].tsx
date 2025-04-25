import React from "react";
import { useRouter } from "next/router";
import Error from "next/error";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { LendingModes } from "@mrgnlabs/mrgn-utils";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { BankChart } from "~/components/common/bank-chart/bank-chart";

import { useMrgnlendStore, useUiStore } from "~/store";

import { Loader } from "~/components/ui/loader";
import Image from "next/image";

export default function BankPage() {
  const router = useRouter();
  const { address } = React.useMemo(() => router.query, [router]);

  const [initialized, fetchMrgnlendState, extendedBankInfos] = useMrgnlendStore((state) => [
    state.initialized,
    state.fetchMrgnlendState,
    state.extendedBankInfos,
  ]);
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);
  const { connected, walletContextState } = useWallet();

  const bank = extendedBankInfos.find((bank) => bank.address.toBase58() === address);

  if (!initialized) {
    return <Loader label="Loading bank..." />;
  }

  if (!address) {
    return <Error statusCode={400} />;
  }

  if (!bank) {
    return <Error statusCode={404} />;
  }

  return (
    <div className="w-full space-y-4 max-w-8xl mx-auto">
      <header className="py-4">
        <h1 className="flex items-center gap-3 text-4xl font-medium">
          <Image src={bank.meta.tokenLogoUri} alt={bank.meta.tokenSymbol} width={48} height={48} />
          {bank.meta.tokenSymbol} Bank
        </h1>
      </header>
      <div className="w-full grid md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
          <BankChart bankAddress={bank.address.toBase58()} />
        </div>
        <div className="md:col-span-4">
          <div className="p-4 space-y-4 w-full">
            <ActionBox.BorrowLend
              useProvider={true}
              lendProps={{
                requestedLendType: lendingMode === LendingModes.LEND ? ActionType.Deposit : ActionType.Borrow,
                connected,
                walletContextState,
                requestedBank: bank,
                showTokenSelection: false,
                captureEvent: (event, properties) => {
                  // capture(event, properties);
                },
                onComplete: () => {
                  fetchMrgnlendState();
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

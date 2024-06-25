import React from "react";

import { useTradeStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard } from "~/components/common/Portfolio/PositionCard";
import { Loader } from "~/components/ui/loader";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

export default function PortfolioPage() {
  const [initialized, selectedAccount, banks, banksIncludingUSDC] = useTradeStore((state) => [
    state.initialized,
    state.selectedAccount,
    state.banks,
    state.banksIncludingUSDC,
  ]);

  const portfolio = React.useMemo(() => {
    const activeBanks = banks.filter((bank) => bank.isActive);
    const longBanks = activeBanks.filter((bank) => bank.isActive && bank.position.isLending);
    const shortBanks = activeBanks.filter((bank) => bank.isActive && !bank.position.isLending);

    if (!longBanks.length && !shortBanks.length) return null;

    return {
      long: longBanks as ActiveBankInfo[],
      short: shortBanks as ActiveBankInfo[],
    };
  }, [banks]);

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="space-y-4">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <PageHeading heading={<h1>Portfolio</h1>} body={<p>Manage your mrgntrade positions.</p>} links={[]} />
          </div>
          <div className="bg-background-gray-dark p-4 rounded-2xl w-full max-w-6xl mx-auto md:p-8">
            {!portfolio ? (
              <div>No positions.</div>
            ) : (
              <div className="grid grid-cols-1 gap-12 w-full md:grid-cols-2">
                <div className="space-y-6">
                  <h2 className="text-2xl font-medium">Long positions</h2>
                  <div className="space-y-8">
                    {portfolio.long.map((bank, index) => (
                      <PositionCard key={index} bank={bank} />
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h2 className="text-2xl font-medium">Short positions</h2>
                  <div className="space-y-8">
                    {portfolio.short.map((bank, index) => (
                      <PositionCard key={index} bank={bank} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

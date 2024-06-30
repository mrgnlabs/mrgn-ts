import React from "react";

import { useTradeStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard } from "~/components/common/Portfolio/PositionCard";
import { Loader } from "~/components/ui/loader";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

export default function PortfolioPage() {
  const [initialized, banks] = useTradeStore((state) => [state.initialized, state.banks]);

  const portfolio = React.useMemo(() => {
    const activeBanks = banks.filter((bank) => bank.isActive);
    const longBanks = activeBanks.filter((bank) => bank.isActive && bank.position.isLending) as ActiveBankInfo[];
    const shortBanks = activeBanks.filter((bank) => bank.isActive && !bank.position.isLending) as ActiveBankInfo[];

    if (!longBanks.length && !shortBanks.length) return null;

    return {
      long: longBanks.sort((a, b) => a.position.usdValue - b.position.usdValue),
      short: shortBanks.sort((a, b) => a.position.usdValue - b.position.usdValue),
    };
  }, [banks]);

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="space-y-4">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <PageHeading heading="Portfolio" body={<p>Manage your mrgntrade positions.</p>} links={[]} />
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
                      <PositionCard key={index} bank={bank} isLong={true} />
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h2 className="text-2xl font-medium">Short positions</h2>
                  <div className="space-y-8">
                    {portfolio.short.map((bank, index) => (
                      <PositionCard key={index} bank={bank} isLong={false} />
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

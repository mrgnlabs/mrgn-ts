import React from "react";

import { IconCheck } from "@tabler/icons-react";

import { StakeCalculator } from "@mrgnlabs/mrgn-ui";
import { useExtendedBanks } from "@mrgnlabs/mrgn-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { LSTOverview, fetchLSTOverview } from "~/components/common/Stake/utils/stake-utils";

export default function StakeCalculatorPage() {
  const { extendedBanks } = useExtendedBanks();
  const [lstOverview, setLstOverview] = React.useState<LSTOverview>();

  React.useEffect(() => {
    fetchLSTOverview().then(setLstOverview);
  }, []);

  const solPrice = React.useMemo(() => {
    const bank = extendedBanks.filter((bank) => bank.info.state.mint.equals(WSOL_MINT));
    return bank.length > 0 ? Math.round(bank[0].info.state.price) : 0;
  }, [extendedBanks]);

  return (
    <div className="flex flex-col items-center justify-center pt-8 px-6 md:pt-0 md:px-0">
      <div className="w-full max-w-2xl mx-auto text-center" id="stake-calculator">
        <h2 className="font-medium text-4xl">Crypto Staking Calculator</h2>
        <p className="text-muted-foreground px-8 text-lg mt-3 md:px-0">
          Calculate your future earnings with our crypto staking calculator.
        </p>
        <ul className="flex flex-col gap-2 items-center justify-center mt-6 text-chartreuse text-sm md:mt-3 md:text-base md:flex-row md:gap-8">
          <li className="flex items-center gap-2">
            <IconCheck size={18} className="text-chartreuse" />
            {lstOverview?.apy ? lstOverview.apy : "~8.5"}% APY
          </li>
          <li className="flex items-center gap-2">
            <IconCheck size={18} className="text-chartreuse" />
            Earn passive income
          </li>
          <li className="flex items-center gap-2">
            <IconCheck size={18} className="text-chartreuse" />
            Protect wealth against inflation
          </li>
        </ul>
        <div className="mt-12">
          <StakeCalculator solPrice={solPrice} apy={lstOverview?.apy || 8.5} />
        </div>
      </div>
    </div>
  );
}

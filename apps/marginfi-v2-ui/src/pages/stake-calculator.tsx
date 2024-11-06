import React from "react";

import { IconCheck } from "@tabler/icons-react";
import { StakeCalculator } from "@mrgnlabs/mrgn-ui";
import { SOL_MINT } from "~/store/lstStore";
import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";

export default function StakeCalculatorPage() {
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);

  const solPrice = React.useMemo(() => {
    const bank = extendedBankInfos.filter((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank.length > 0 ? Math.round(bank[0].info.state.price) : 0;
  }, [extendedBankInfos]);

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
            Maximize rewards
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
          <StakeCalculator solPrice={solPrice} />
        </div>
      </div>
    </div>
  );
}

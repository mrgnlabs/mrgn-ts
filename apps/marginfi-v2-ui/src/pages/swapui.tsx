import React, { FC, useState, useEffect, MouseEvent } from 'react';
import { ActionToggle } from '~/components/Swap/ActionToggle';
import { HealthFactorGauge } from '~/components/Swap/HealthFactorGauge';
import { InputBox } from '~/components/Swap/InputBox';

import { useBanks, useProgram, useUserAccounts } from "~/context";
import { useWallet } from "@solana/wallet-adapter-react";
import { AssetRowAction } from '~/components/Swap/ActionButton';

interface SwapUIProps {
  healthFactor: number;
}

const SwapUI: FC<SwapUIProps> = ({ healthFactor }) => {
  const { mfiClient } = useProgram();
  const { reload } = useBanks();
  const { extendedBankInfos, selectedAccount, nativeSolBalance } = useUserAccounts();
  const wallet = useWallet();
  
  const [selectedAction, setSelectedAction] = useState('Lend');

  // Hack required to circumvent rehydration error
  // @todo do we still need this in this UI?
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return null;
  }

  const handleActionChange = (
    event: MouseEvent<HTMLElement>,
    newAction: string | null,
  ) => {
    if (newAction) setSelectedAction(newAction);
  };

  const topInputBoxLabel = selectedAction === 'Borrow' ? 'Lend' : selectedAction;

  return (
    <div className="p-4 mt-2 w-full relative">
      <ActionToggle
        selectedAction={selectedAction}
        handleActionChange={handleActionChange}
      />
      <div className="h-[320px] w-[400px] flex flex-col items-center justify-between mx-auto rounded-2xl px-10 py-8 bg-[#0E1113] border-2 border-[#1C2125] gap-2">
        <div
          className="absolute top-[82px]"
        >
          <div
            className="w-[64px] h-[64px] flex justify-center items-center mx-auto rounded-full bg-[#0E1113] border-2 border-[#1C2125]"
          >
            {/* <img src={iconPath} alt={product} className="w-6" /> */}
          </div>
        </div>
        {
          extendedBankInfos.length > 0 && (
            <div className="gap-1">
              <InputBox
                // value, 
                // setValue, 
                // maxValue, 
                // maxDecimals, 
                // disabled,
                extendedBankInfos={extendedBankInfos}
                label={topInputBoxLabel}
                top={true}
              />
              {selectedAction === 'Borrow' && (
                <InputBox
                  // value, 
                  // setValue, 
                  // maxValue, 
                  // maxDecimals, 
                  // disabled,
                  extendedBankInfos={extendedBankInfos}
                  label="Borrow"
                  top={false}
                />
              )}
            </div>
          )
        }
        <div className="flex flex-col justify-center">
          <AssetRowAction>{selectedAction}</AssetRowAction>
        </div>
      </div>
    </div>
  );
};

export default SwapUI;

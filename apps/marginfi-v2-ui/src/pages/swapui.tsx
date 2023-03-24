import React, { FC, useState, useEffect, MouseEvent } from 'react';
import Image from 'next/image';

import { ActionToggle } from '~/components/Swap/ActionToggle';
import { InputBox } from '~/components/Swap/InputBox';

import { useBanks, useProgram, useUserAccounts } from "~/context";
import { useWallet } from "@solana/wallet-adapter-react";
import { AssetRowAction } from '~/components/Swap/ActionButton';
import { ProductType } from '~/types';
import config from '~/config';

// const products = [
//   {
//     name: 'Lend',
//     icon: <YardIcon className="h-[60%] w-[60%]" style={{ color: '#1C2125' }}/>,
//   },
//   {
//     name: 'Borrow',
//     icon: <HailIcon className="h-[60%] w-[60%]" style={{ color: '#1C2125' }}/>,
//   },
//   {
//     name: 'Lock',
//     icon: <LockIcon className="h-[60%] w-[60%]" style={{ color: '#1C2125' }}/>,
//   },
//   {
//     name: '⚡️stake',
//     icon: <BoltIcon className="h-[60%] w-[60%]" style={{ color: '#DCE85D' }}/>,
//   },
// ]

const HalfCircularGauge = ({ percentage }: { percentage: number }) => {
  const viewBox = "0 0 100 50";
  const radius = 45;
  const cx = 50;
  const cy = 50 + 10;
  const startAngle = -167;
  const endAngle = -13;
  const needleWidth = 2;
  const gaugeColor = `rgb(${255 * (1 - percentage / 100) + 100}, ${255 * percentage / 100 + 100}, 100)`;
  const needleColor = "#DCE85D";

  // calculate the angle of the needle based on the percentage
  const angle = startAngle + (endAngle - startAngle) * (percentage / 100);

  // calculate the coordinates of the needle tip
  const x = cx + radius * Math.cos(angle * Math.PI / 180);
  const y = cy + radius * Math.sin(angle * Math.PI / 180);

  return (
    <svg
      viewBox={viewBox} className="absolute h-[100px] w-[200px] left-[-68px] bottom-[32px] z-[-1]"
    >
      <path
        d={`M ${cx - radius}, ${cy} A ${radius}, ${radius} 0 0 1 ${cx + radius}, ${cy}`}
        stroke={gaugeColor}
        strokeWidth={10}
        fill="none"
      />
      <path
        d={`M ${cx}, ${cy - 10} L ${x}, ${y}`}
        stroke={needleColor}
        strokeWidth={needleWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};

interface SwapUIProps {
  healthFactor: number;
}

const SwapUI: FC<SwapUIProps> = ({ healthFactor }) => {
  const { mfiClient } = useProgram();
  const { reload } = useBanks();
  const { extendedBankInfos, selectedAccount, nativeSolBalance } = useUserAccounts();
  const wallet = useWallet();
  
  const [selectedAction, setSelectedAction] = useState(ProductType.Lend);

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

  const topInputBoxLabel = selectedAction.name === ProductType.Borrow ? 'Lend' : selectedAction.name;

  return (
    <div className="p-4 mt-2 w-full relative">
      <ActionToggle
        // products={config.productsConfig}
        selectedAction={selectedAction}
        handleActionChange={handleActionChange}
      />
      <div className="h-[320px] w-[400px] flex flex-col items-center justify-between mx-auto rounded-2xl px-10 py-8 bg-[#0E1113] border-2 border-[#1C2125] gap-2">
        <div
          className="absolute top-[140px]"
        >
          <HalfCircularGauge
            percentage={healthFactor || 75 }
          />
          <div className="w-[64px] h-[64px] flex justify-center items-center mx-auto rounded-full bg-[#0E1113] border-2 border-[#1C2125]">
            <Image src="/marginfi_logo.png" alt="marginfi logo" height={32} width={32} className="pb-1" />
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
              {selectedAction.name === ProductType.Borrow && (
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
          <AssetRowAction>{selectedAction.name}</AssetRowAction>
        </div>
      </div>
    </div>
  );
};

export default SwapUI;

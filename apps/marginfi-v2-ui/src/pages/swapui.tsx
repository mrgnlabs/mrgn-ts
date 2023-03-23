import React, { FC, useState, MouseEvent } from 'react';
import ActionToggle from '~/components/Swap/ActionToggle';
import InputBox from '~/components/Swap/InputBox';
// import ProductIcon from '~/components/Swap/ProductIcon';
import HealthFactorGauge from '~/components/Swap/HealthFactorGauge';

interface Token {
  value: string;
  label: string;
  image: string;
  borderColor?: string;
}

interface SwapUIProps {
  tokens: Token[];
  healthFactor: number;
}

const SwapUI: FC<SwapUIProps> = ({ tokens, healthFactor }) => {
  const [selectedAction, setSelectedAction] = useState('Lend');

  const handleActionChange = (
    event: MouseEvent<HTMLElement>,
    newAction: string | null,
  ) => {
    if (newAction) setSelectedAction(newAction);
  };

  const inputBoxLabel = selectedAction === 'Borrow' ? 'Lend' : selectedAction;

  return (
    <div className="p-4 mt-2 w-full relative">
      <ActionToggle
        selectedAction={selectedAction}
        handleActionChange={handleActionChange}
      />
      <div className="w-4/5 md:w-2/3 max-w-[400px] mx-auto flex flex-col items-center">
        <HealthFactorGauge healthFactor={healthFactor} />
        <div className="absolute mt-16 space-y-4 bg-transparent min-h-[400px] min-w-[400px] z-10">
          {/* <InputBox tokens={tokens} label={inputBoxLabel} /> */}
          {/* {selectedAction === 'Borrow' && (
            <InputBox tokens={tokens} label="Borrow" />
          )}
          <div className="flex justify-center">
            <ProductIcon product={selectedAction} />
          </div>
          <div className="flex justify-center">
            <button className="bg-gray-600 text-[#e1e1e1] px-4 py-2">
              {selectedAction}
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default SwapUI;

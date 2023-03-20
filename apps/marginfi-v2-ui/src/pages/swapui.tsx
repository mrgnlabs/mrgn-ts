import React, { FC, useState, MouseEvent } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import InputBox from '~/components/Swap/InputBox';
import ProductIcon from '~/components/Swap/ProductIcon';
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
    <div className="bg-[#0E1113] p-4 mt-2 w-full relative">
      <HealthFactorGauge healthFactor={healthFactor} />
      <ToggleButtonGroup
        value={selectedAction}
        exclusive
        onChange={handleActionChange}
        className="flex justify-center block mb-2"
      >
        <ToggleButton value="Lend">Lend</ToggleButton>
        <ToggleButton value="Borrow">Borrow</ToggleButton>
        <ToggleButton value="Lock">Lock</ToggleButton>
        <ToggleButton value="Superstake">Superstake</ToggleButton>
      </ToggleButtonGroup>
      <div className="space-y-4">
        <InputBox tokens={tokens} label={inputBoxLabel} />
        {selectedAction === 'Borrow' && (
          <InputBox tokens={tokens} label="Borrow" />
        )}
        <div className="flex justify-center">
          <ProductIcon product={selectedAction} />
        </div>
        <div className="flex justify-center">
          <button className="bg-gray-600 text-[#e1e1e1] px-4 py-2">
            {selectedAction}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapUI;

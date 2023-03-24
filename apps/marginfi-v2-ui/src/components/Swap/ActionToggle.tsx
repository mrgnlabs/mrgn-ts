import React, { MouseEvent, useState } from 'react';
import { ToggleButtonGroup } from '@mui/material';
import CustomToggleButton from './CustomToggleButton';

type ProductType = {
  name: string;
}

interface ActionToggleProps {
  products: ProductType[];
  selectedAction: string;
  handleActionChange: (event: MouseEvent<HTMLElement>, newAction: string | null) => void;
}

const ActionToggle: React.FC<ActionToggleProps> = ({ products, selectedAction, handleActionChange }) => {
  const [indicatorPosition, setIndicatorPosition] = useState(0);

  const handleButtonClick = (
    event: MouseEvent<HTMLElement>,
    newAction: string | null,
    position: number
  ) => {
    handleActionChange(event, newAction);
    setIndicatorPosition(position);
  };

  // const options = ['Lend', 'Borrow', 'Lock', '⚡️stake'];

  return (
    <div className="relative w-[340px] mx-auto mb-[111px]">
      <ToggleButtonGroup
        value={selectedAction}
        exclusive
        className="w-full flex justify-between border-[#1C2125] rounded-[30px] bg-[#0D1011] mb-2"
      >
        {products.map((option, index, arr) => (
          <CustomToggleButton
            key={option.name}
            value={option.name}
            selectedAction={selectedAction}
            onClick={(event) => handleButtonClick(event, option.name, index)}
            index={index}
            arr={arr}
          >
            <span className="relative z-10">{option.name}</span>
          </CustomToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
};

export { ActionToggle };

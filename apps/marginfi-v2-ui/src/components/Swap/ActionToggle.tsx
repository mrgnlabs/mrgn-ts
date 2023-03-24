import React, { MouseEvent, useState } from 'react';
import { ToggleButtonGroup } from '@mui/material';
import CustomToggleButton from './CustomToggleButton';
import config from '~/config';

type ProductType = {
  name: string;
}

interface ActionToggleProps {
  selectedAction: string;
  handleActionChange: (event: MouseEvent<HTMLElement>, newAction: string | null) => void;
}

const ActionToggle: React.FC<ActionToggleProps> = ({ selectedAction, handleActionChange }) => {
  const [indicatorPosition, setIndicatorPosition] = useState(0);

  const handleButtonClick = (
    event: MouseEvent<HTMLElement>,
    newAction: ProductType | null,
    position: number
  ) => {
    handleActionChange(event, newAction);
    setIndicatorPosition(position);
  };

  return (
    <div className="relative w-[340px] mx-auto mb-[111px]">
      <ToggleButtonGroup
        value={selectedAction}
        exclusive
        className="w-full flex justify-between border-[#1C2125] rounded-[30px] bg-[#0D1011] mb-2"
      >
        {Object.keys(config.productsConfig).map((option, index, arr) => (
          <CustomToggleButton
            key={config.productsConfig[option].name}
            value={config.productsConfig[option].name}
            selectedAction={selectedAction}
            onClick={(event) => handleButtonClick(event, config.productsConfig[option], index)}
            index={index}
            arr={arr}
          >
            <span className="relative z-10">{config.productsConfig[option].name}</span>
          </CustomToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
};

export { ActionToggle };

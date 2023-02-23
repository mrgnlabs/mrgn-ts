import { Dispatch, SetStateAction } from "react";

import React, { FC } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ProductType } from '~/types';

interface FourOptionToggleProps {
  productType: ProductType;
  setProductType: Dispatch<SetStateAction<ProductType>>;
  productTypes: ProductType[];
}

const FourOptionToggle: FC<FourOptionToggleProps> = ({
  productType,
  setProductType,
  productTypes
}) => {

  const handleChange = (event) => {
    if (event.target.value === productType) {
      return;
    }
    if (!productTypes.includes(event.target.value)) {
      throw Error(`Invalid action option: ${event.target.value}`);
    }
    setProductType(event.target.value);
  };

  return (
    <ToggleButtonGroup
      className="w-full"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        border: 'solid #1c2125 !important',
        borderRadius: '30px !important',
        backgroundColor: '#0D1011 !important',
        maxWidth: '400px',
      }}
      value={productType}
      onChange={handleChange}
    >
      {productTypes.map((option) => (
        <ToggleButton
          key={option} 
          value={option}
          className={option === productTypes[productTypes.length - 1] ? "pl-5 sm:pl-[40px] sm:pr-[30px] ml-[-20px] sm:ml-[-30px]" : ""}
          sx={{
            backgroundColor: '#0D1011 !important',
            textTransform: 'capitalize !important',
            color: productType === option ? '#fff !important' : '#868E95 !important',
            borderLeft: 'solid #0D1011 !important',
            borderTop: option === productTypes[3] ? 'solid #62672E !important' : 'none !important',
            borderBottom: option === productTypes[3] ? 'solid #62672E !important' : 'none !important',
            borderRight: option === productTypes[2] || option === productTypes[3] ? 'solid #62672E !important' : 'solid #0D1011 !important',
            borderTopLeftRadius: option === productTypes[0] ? '30px !important' : '0px !important',
            borderBottomLeftRadius: option === productTypes[0] ? '30px !important' : '0px !important',
            borderTopRightRadius: option === productTypes[2] || option === productTypes[3] ? '30px !important' : '0px !important',
            borderBottomRightRadius: option === productTypes[2] || option === productTypes[3] ? '30px !important' : '0px !important',
            minWidth: '25% !important',
            zIndex: option === productTypes[productTypes.length - 1] ? 1 : 2,
          }}
        >
          {option}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export { FourOptionToggle }

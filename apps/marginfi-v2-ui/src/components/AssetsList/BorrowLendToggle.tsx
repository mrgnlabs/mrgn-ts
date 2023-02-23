import { Dispatch, SetStateAction } from "react";

import React, { FC } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ProductType } from '~/types';

import LockIcon from '@mui/icons-material/Lock';
import YardIcon from '@mui/icons-material/Yard';
import HailIcon from '@mui/icons-material/Hail';
import BoltIcon from '@mui/icons-material/Bolt';

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
      className="w-full max-w-[100%] sm:max-w-[33%]"
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

interface DescriptionOrbProps {
  productType: ProductType;
}

const DescriptionOrb: FC<DescriptionOrbProps> = ({ productType }) => {

  const productDescriptions = {
    [ProductType.Lock]: "Lockup offers a guaranteed APY for a given time period.",
    [ProductType.Lend]: "Lend and earn the best yields in DeFi.",
    [ProductType.Borrow]: "Borrow against your marginfi deposits.",
    [ProductType.Superstake]: "Superstake is marginfi's premier levered staking product. Earn outrageously.",
  }

  const ProductIcons = {
    [ProductType.Lock]: <LockIcon />,
    [ProductType.Lend]: <YardIcon />,
    [ProductType.Borrow]: <HailIcon />,
    [ProductType.Superstake]: <BoltIcon />,
  }

  return (
    <div
      className='flex items-center'
    >
      <div
        className="h-full w-[120px] flex justify-center items-center"
        style={{
          backgroundColor: 'solid #0D1011',
          borderRadius: '30px',
          border: 'solid #1c2125',
          zIndex: 1,
          marginRight: '-60px',
          paddingRight: '60px',
        }}
      >
        <div
          className="h-[40px] w-[40px] bg-[#1c2125] flex justify-center items-center rounded-3xl"
        >
          {ProductIcons[productType]}
        </div>
        
      </div>
      <div
        className="flex items-center bg-[#16191B] h-full px-4"
        style={{
          borderRadius: '30px',
          zIndex: 3,
          border: 'solid #1c2125',
          color: '#CACACA',
        }}
      >
        {productDescriptions[productType]}
      </div>
    </div>
  )
}

export { FourOptionToggle, DescriptionOrb }

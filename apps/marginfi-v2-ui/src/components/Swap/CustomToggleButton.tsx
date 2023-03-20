import React, { MouseEvent } from 'react';
import { ToggleButton } from '@mui/material';

interface CustomToggleButtonProps {
  value: string;
  selectedAction: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  index: number;
  arr: string[];
  children: React.ReactNode;
}

const CustomToggleButton: React.FC<CustomToggleButtonProps> = ({
  value,
  selectedAction,
  onClick,
  index,
  arr,
  children,
}) => {
  return (
    <ToggleButton
      value={value}
      onClick={onClick}
      className={`w-1/4 text-sm sm:text-base ${
        index === arr.length - 1
          ? 'pl-5 sm:pl-[40px] sm:pr-[30px] ml-[-20px] sm:ml-[-30px]'
          : ''
      }`}
      sx={{
        backgroundColor:
          selectedAction === value && value === '⚡️stake'
            ? '#DCE85D !important'
            : '#0D1011 !important',
        textTransform: 'capitalize !important',
        color:
          selectedAction === value
            ? value === '⚡️stake'
              ? '#000 !important'
              : '#fff !important'
            : '#868E95 !important',
        borderLeft: 'solid #0D1011 !important',
        borderTop: index === 3 ? 'solid #62672E !important' : 'none !important',
        borderBottom: index === 3 ? 'solid #62672E !important' : 'none !important',
        borderRight:
          index === 2 || index === 3
            ? 'solid #62672E !important'
            : 'solid #0D1011 !important',
        borderTopLeftRadius: index === 0 ? '30px !important' : '0px !important',
        borderBottomLeftRadius: index === 0 ? '30px !important' : '0px !important',
        borderTopRightRadius:
          index === 2 || index === 3 ? '30px !important' : '0px !important',
        borderBottomRightRadius:
          index === 2 || index === 3 ? '30px !important' : '0px !important',
        minWidth: '25% !important',
        zIndex: index === arr.length - 1 ? 1 : 2,
      }}
    >
      {children}
    </ToggleButton>
  );
};

export default CustomToggleButton;

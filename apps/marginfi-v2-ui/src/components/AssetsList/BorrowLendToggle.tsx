import { styled, Switch, SwitchProps } from "@mui/material";
import { Dispatch, SetStateAction } from "react";

import React, { useState, FC } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

interface FourOptionToggleProps {
  currentAction: string;
  setCurrentAction: Dispatch<SetStateAction<string>>;
  actionOptions: string[];
}

const FourOptionToggle: FC<FourOptionToggleProps> = ({
  currentAction,
  setCurrentAction,
  actionOptions
}) => {

  const handleChange = (event) => {
    if (event.target.value === currentAction) {
      return;
    }
    if (!actionOptions.includes(event.target.value)) {
      throw Error(`Invalid action option: ${event.target.value}`);
    }
    setCurrentAction(event.target.value);
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
      value={currentAction}
      onChange={handleChange}
    >
      {actionOptions.map((option) => (
        <ToggleButton
          key={option} 
          value={option}
          className={option === actionOptions[actionOptions.length - 1] ? "pl-5 sm:pl-[40px] sm:pr-[30px] ml-[-20px] sm:ml-[-30px]" : ""}
          sx={{
            backgroundColor: '#0D1011 !important',
            textTransform: 'capitalize !important',
            color: currentAction === option ? '#fff !important' : '#868E95 !important',
            borderLeft: 'solid #0D1011 !important',
            borderTop: option === actionOptions[3] ? 'solid #62672E !important' : 'none !important',
            borderBottom: option === actionOptions[3] ? 'solid #62672E !important' : 'none !important',
            borderRight: option === actionOptions[2] || option === actionOptions[3] ? 'solid #62672E !important' : 'solid #0D1011 !important',
            borderTopLeftRadius: option === actionOptions[0] ? '30px !important' : '0px !important',
            borderBottomLeftRadius: option === actionOptions[0] ? '30px !important' : '0px !important',
            borderTopRightRadius: option === actionOptions[2] || option === actionOptions[3] ? '30px !important' : '0px !important',
            borderBottomRightRadius: option === actionOptions[2] || option === actionOptions[3] ? '30px !important' : '0px !important',
            minWidth: '25% !important',
            zIndex: option === actionOptions[actionOptions.length - 1] ? 1 : 2,
          }}
        >
          {option}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export { FourOptionToggle }

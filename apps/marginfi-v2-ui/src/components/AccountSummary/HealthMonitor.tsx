import { FC, JSXElementConstructor, ReactElement, ReactFragment, useState } from 'react';
import Slider, { SliderThumb, SliderValueLabelProps } from '@mui/material/Slider';
import { styled } from '@mui/material/styles';

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

const HealthSlider = styled(Slider)(({ theme }) => ({
    height: 2,
    padding: '15px 0',
    '& .MuiSlider-thumb': {
      height: 14,
      width: 14,
      backgroundColor: '#fff',
      '&:focus, &:hover, &.Mui-active': {
        boxShadow: 'none',
      },
    },
    '& .MuiSlider-track': {
      border: 'none',
        background: 'transparent',
    },
    '& .MuiSlider-rail': {
        opacity: 1,
        background: 'linear-gradient(to right, #ff0000, #00ff00)',
    },
    '& .MuiSlider-mark': {
      backgroundColor: '#fff',
      top: '6px',
      height: 5,
      width: 1,
    },
    '& .MuiSlider-markLabel': {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Aeonik Pro',
        fontWeight: 400,
        position: 'absolute',
        top: '-15px',
      },
  }));

  const marks = [
    { value: 0, label: 'Liquidation' },
    { value: 10 },
    { value: 20 },
    { value: 30 },
    { value: 40 },
    { value: 50 },
    { value: 60 },
    { value: 70 },
    { value: 80 },
    { value: 90 },
    { value: 100 },
  ];
  

interface HealthMonitorProps {
    initialValue: number;
}

const HealthFactor: FC<HealthMonitorProps> = ({ initialValue }) => {
    const [value, setValue] = useState(initialValue);
  
    return (
      <div
        className="w-[28%] min-w-[320px] h-[112px] rounded-lg bg-black-800 shadow-md p-2 px-4 flex flex-col justify-between"
        style={{ 
            backgroundImage: 'url("https://i.imgur.com/DVnMT9l.png")', 
            backgroundSize: 'cover', 
        }}
    >
        <label
            className="block mb-6 text-lg font-bold text-gray-900 dark:text-white"
            style={{
                fontFamily: 'Aeonik Pro',
                fontWeight: 400,
            }}
        >
            Health factor
        </label>
        
        <div
            className="h-9 px-5"
        >
        <HealthSlider
            className="h-2 rounded-lg"
            marks={marks}
            disabled
            value={value}
        />
        </div>
    </div>
  );
}

export { HealthFactor };

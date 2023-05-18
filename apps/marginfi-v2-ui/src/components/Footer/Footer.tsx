import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@mui/material";
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import { lendZoomLevel } from '~/state';
import { useRecoilState } from 'recoil';


const Footer: FC = () => {
  const wallet = useWallet();

  const [_, setZoom] = useRecoilState(lendZoomLevel);

  const onChange = (event: any) => {
    setZoom(event.target.value);
  };

  return (
    <header>
      <div
        className="fixed w-full bottom-0 h-[34px] z-20"
        style={{
          backgroundColor: '#0F1111'
        }}
      >
        <div
          className="w-full bottom-0 flex justify-between items-center h-[34px] text-2xl z-10"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="w-1/3 max-w-[75px] h-full max-h-full justify-center items-center">
            <Slider defaultValue={4} step={1} min={0} max={4}
              sx={{ 
                color: '#dce85d',
                '& .MuiSlider-thumb': {
                  boxShadow: '0 0 0 8px rgba(220, 232, 93, 0.04)',
                  '&:hover': {
                    boxShadow: '0 0 0 8px rgba(220, 232, 93, 0.08)',
                  },
                }
              }} 
              size="small"
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export { Footer, lendZoomLevel };

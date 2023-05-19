import { FC } from "react";
import Slider from '@mui/material/Slider';
import { lendZoomLevel, denominationUSD } from '~/state';
import { useRecoilState } from 'recoil';
import Switch from '@mui/material/Switch';


const Footer: FC = () => {

  const [_, setZoom] = useRecoilState(lendZoomLevel);
  const [denomination, setDenominationUSD] = useRecoilState(denominationUSD);

  const zoomOnChange = (event: any) => {
    setZoom(event.target.value);
  };

  const denominationOnChange = (event: any) => {
    setDenominationUSD(event.target.checked);
  }

  return (
    <header>
      <div
        className="hidden xl:flex fixed w-full bottom-0 h-[34px] z-20"
        style={{
          backgroundColor: '#010101'
        }}
      >
        <div
          className="w-full bottom-0 flex justify-start items-center h-[34px] text-2xl z-10 px-8 gap-8"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div
            className="w-[60px] h-full max-h-full flex justify-center items-center"
          >
            <Slider defaultValue={3} step={1} min={1} max={3}
              sx={{ 
                color: 'rgb(227, 227, 227)',
                '& .MuiSlider-thumb': {
                  boxShadow: '0 0 0 8px rgba(227, 227, 227, 0.04)',
                  '&:hover': {
                    boxShadow: '0 0 0 8px rgba(227, 227, 227, 0.08)',
                  },
                }
              }} 
              onChange={zoomOnChange}
            />
          </div>
          <div
            className="w-[90px] h-full max-h-full flex justify-center items-center"
            style={{
              borderLeft: 'solid rgba(227, 227, 227, 0.4) 1px',
            }}
          >
            <Switch
              onChange={denominationOnChange}
              sx={{
                color: '#fff',
                '& .MuiSwitch-thumb': {
                  backgroundColor: '#fff',
                },
                '& .MuiSwitch-switchBase': {
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#fff',
                    color: '#fff',
                    '&.Mui-checked': {
                      backgroundColor: '#fff',
                    },
                  }
                }
              }}
              checked={denomination}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export { Footer };

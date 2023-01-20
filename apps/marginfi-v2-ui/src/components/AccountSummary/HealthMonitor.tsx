import { FC } from "react";
import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import BigNumber from "bignumber.js";

const HealthSlider = styled(Slider)(() => ({
  height: 2,
  padding: "15px 0",
  "& .MuiSlider-thumb": {
    height: 14,
    width: 14,
    backgroundColor: "#fff",
    "&:focus, &:hover, &.Mui-active": {
      boxShadow: "none",
    },
  },
  "& .MuiSlider-track": {
    border: "none",
    background: "transparent",
  },
  "& .MuiSlider-rail": {
    opacity: 1,
    background: "linear-gradient(to right, #ff0000, #00ff00)",
  },
  "& .MuiSlider-mark": {
    backgroundColor: "#fff",
    top: "6px",
    height: 7,
    width: 2,
  },
  "& .MuiSlider-markLabel": {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Aeonik Pro",
    fontWeight: 400,
    position: "absolute",
    top: "-25px",
    marginLeft: "15px",
  },
}));

const marks = [
  { value: 0, label: "Liquidation" },
  { value: 10 },
  { value: 20 },
  { value: 30 },
  { value: 40 },
  { value: 50 },
  { value: 60 },
  { value: 70 },
  { value: 80 },
  { value: 90 },
  { value: 99 }, // 99 instead of 100 for formatting, should not change anything but placement of mark
];

interface HealthMonitorProps {
  healthFactor: number;
}

const SENSITIVITY_THRESHOLD = 6;

const HealthFactor: FC<HealthMonitorProps> = ({ healthFactor }) => {
  const healthFactorPercent = new BigNumber(healthFactor)
    .decimalPlaces(SENSITIVITY_THRESHOLD, BigNumber.ROUND_HALF_DOWN)
    .multipliedBy(100)
    .toNumber();

  return (
    <div
      className="w-[31%] min-w-[320px] h-[130px] rounded-lg bg-black-800 shadow-md p-2 pl-4 pr-3 flex flex-col justify-between"
      style={{
        backgroundImage: 'url("https://i.imgur.com/DVnMT9l.png")',
        backgroundSize: "cover",
      }}
    >
      <div className="flex w-full justify-between">
        <label
          className="block mb-6 text-xl font-bold text-gray-900 dark:text-white"
          style={{
            fontFamily: "Aeonik Pro",
            fontWeight: 400,
          }}
        >
          Health factor
        </label>
        <label
          className="w-[40px] flex justify-center items-center mb-6 bg-[#0A0A0A] rounded-md text-[#ffffffcc]"
          style={{
            fontFamily: "Aeonik Pro",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {Math.floor(healthFactorPercent)}
        </label>
      </div>

      <div className="h-9 px-5">
        <HealthSlider
          className="h-2 rounded-lg"
          marks={marks}
          disabled
          value={healthFactorPercent}
        />
      </div>
    </div>
  );
};

export { HealthFactor };

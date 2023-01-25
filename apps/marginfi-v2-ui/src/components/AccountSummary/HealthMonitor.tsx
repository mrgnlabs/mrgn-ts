import { FC, useState } from "react";
import { Slider } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { styled } from "@mui/material/styles";
import BigNumber from "bignumber.js";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

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
    height: 5,
    width: 1,
  },
  "& .MuiSlider-markLabel": {
    color: "#c4c6bf",
    fontSize: 10,
    fontFamily: "Aeonik Pro",
    fontWeight: 400,
    position: "absolute",
    top: "-15px",
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
  { value: 100 },
];

interface HealthMonitorProps {
  healthFactor: number;
}

const SENSITIVITY_THRESHOLD = 6;

const HealthFactor: FC<HealthMonitorProps> = ({ healthFactor }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const healthFactorPercent = new BigNumber(healthFactor)
    .decimalPlaces(SENSITIVITY_THRESHOLD, BigNumber.ROUND_HALF_DOWN)
    .multipliedBy(100)
    .toNumber();

  const openTooltip = () => {
    setShowTooltip(true);
  };

  const closeTooltip = () => {
    setShowTooltip(false);
  };

  return (
    <div
      className="w-[28%] min-w-[320px] h-[112px] rounded-lg bg-black-800 shadow-md p-2 pl-4 pr-3 flex flex-col justify-between"
      style={{
        backgroundImage: 'url("https://i.imgur.com/DVnMT9l.png")',
        backgroundSize: "cover",
      }}
      onMouseLeave={closeTooltip}
    >
      {showTooltip && (
        <>
          <div className="flex w-full h-full justify-between">
            <label
              className="block text-lg font-bold"
              style={{
                fontFamily: "Aeonik Pro",
                fontWeight: 300,
                fontSize: 16,
                color: "#c4c6bf",
              }}
            >
              Health factor
              <InfoIcon className="ml-2" onMouseEnter={openTooltip} />
            </label>
          </div>

          <div className="h-full w-full flex">
            <div
              className="h-full w-2/3"
              style={{
                fontFamily: "Aeonik Pro",
                fontWeight: 300,
                fontSize: 12,
                color: "#c4c6bf",
              }}
            >
              Calculates portfolio risk and ranges from 0% (liquidation) to 100% (no debt). The formula is:
            </div>
            <div
              className="h-full"
              style={{
                fontFamily: "Aeonik Pro",
                fontWeight: 300,
                fontSize: 11,
                color: "#c4c6bf",
              }}
            >
              <BlockMath math={"\\frac{assets-liabilities}{assets}"} />
            </div>
          </div>
        </>
      )}

      {!showTooltip && (
        <>
          <div className="flex w-full justify-between">
            <label
              className="block mb-6 text-lg font-bold"
              style={{
                fontFamily: "Aeonik Pro",
                fontWeight: 300,
                fontSize: 16,
                color: "#c4c6bf",
              }}
            >
              Health factor
              <InfoIcon className="ml-2" onMouseEnter={openTooltip} />
            </label>

            <label
              className="w-[40px] flex justify-center items-center mb-6 bg-[#0A0A0A] rounded-md text-[#c4c6bf]"
              style={{
                fontFamily: "Aeonik Pro",
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {`${Math.floor(healthFactorPercent)}%`}
            </label>
          </div>

          <div className="h-9 px-5">
            <HealthSlider className="h-2 rounded-lg" marks={marks} disabled value={healthFactorPercent} />
          </div>
        </>
      )}
    </div>
  );
};

export { HealthFactor };

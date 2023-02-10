import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useUserAccounts } from "~/context";
import { styled } from "@mui/material/styles";
import { LinearProgress } from '@mui/material';
import InfoIcon from "@mui/icons-material/Info";

const Marks = ({ marks }) => (
  marks.map(
    (mark, index) => (
      <div
        className="flex flex-col"
        style={{
          border: 'solid white 1px',
        }}
      >
        <div
          key={index}
          style={{ 
            left: `${mark.value}%`,
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: `${mark.color}`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          className="flex justify-center items-center"
        >
          <div
            className="mt-12 text-xs text-[#484848]"
            style={{
              letterSpacing: '4px',
            }}
          >
            {mark.label}
          </div>
        </div>        
      </div>
    ))
)

const Pro = () => {
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();

  const [progressPercent, setProgressPercent] = React.useState(50);

  const marks = [
    { value: 0, label: "CONNECT", color: progressPercent > 0 ? '#51B56A': '#484848' },
    { value: 50, label: "DEPOSIT", color: progressPercent >= 50 ? '#51B56A' : '#484848' },
    { value: 100, label: "CONFIRMED", color: progressPercent >= 100 ? '#51B56A' : '#484848' },
  ];

  return (
    <>
      <PageHeader />
      <div
        className="h-full flex flex-col justify-start items-center content-start py-[64px] w-4/5 max-w-7xl gap-4"
        style={{
          border: 'solid red 1px',
        }}
      >
        <div
          // header
          className="h-[200px] w-[320px]"
          style={{
            border: 'solid green 1px',
          }}
        >
          <div className="w-full h-[100px] grid grid-cols-2">
            <div className="flex flex-col gap-1">
              <div
                className="text-base"
                style={{ fontWeight: 400 }}
              >
                Your Deposit: <span style={{ color: "#51B56A" }}>$0</span>
              </div>
              <div className="text-sm text-[#2E2E2E]">Max Allocation: $500,000</div>
            </div>
            <div className="text-right flex flex-col">
              <div className="text-[#2E2E2E] text-base flex justify-end">
                APY
                <InfoIcon
                  className="ml-2"
                  // onMouseEnter={openTooltip} 
                />
              </div>
              <div className="text-[#D4FF59] text-xl" style={{ fontWeight: 400 }}>+9%</div>
            </div>
            <div className="col-span-full flex flex-col justify-center items-center">
                <LinearProgress
                  className="h-1 w-[320px] rounded-lg" 
                  variant="determinate"
                  color="inherit"
                  value={progressPercent}
                  sx={{
                      backgroundColor: '#484848',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#51B56A',
                      }
                  }}
                />
                <div className="flex absolute w-[320px] self-center justify-between">
                  <Marks marks={marks}/>
                </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Pro;

import { FC, useEffect, useState } from "react";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import MouseOverPopover from "../Modals/PopOver";
import PopUp from "../Modals/PopUp";
import TwitterIcon from "@mui/icons-material/Twitter";
import AppSettings from "../Modals/AppSettings";
import { Helius } from "helius-sdk";
import { groupedNumberFormatter } from "~/utils/formatters";

const Footer: FC = () => {
  const [tps, setTps] = useState(0);

  useEffect(() => {
    const getAsset = async () => {
      const helius = new Helius("dd7e159d-1568-4bc1-94a5-28118bd0e3b3");

      const tpsValue = await helius.rpc.getCurrentTPS();

      setTps(tpsValue);
    };
    getAsset();
  }, [tps]);

  return (
    <footer>
      <div
        className="hidden xl:flex fixed w-full bottom-0 h-[34px] z-20"
        style={{
          backgroundColor: "#010101",
        }}
      >
        <div
          className="w-full bottom-0 flex justify-start items-center h-[34px] text-2xl z-10 "
          style={{
            border: "solid #1C2125 1px",
          }}
        >
          <AppSettings />

          <div className="w-full h-full max-h-full flex justify-between items-center">
            <div
              className="w-[120px] h-full max-h-full flex justify-between items-center px-2"
              style={{
                borderLeft: "solid rgba(227, 227, 227, 0.4) 1px",
              }}
            >
              <a target="_blank" href="https://twitter.com/marginfi">
                <TwitterIcon
                  sx={{
                    fontSize: "18px",
                    "&:hover": {
                      filter: "drop-shadow( 0 0 10px #dce85d)",
                      color: "#dce85d",
                    },
                  }}
                />
              </a>
              <a target="_blank" href="https://docs.marginfi.com" className="glow-on-hover">
                <AutoStoriesOutlinedIcon
                  sx={{
                    fontSize: "18px",
                    marginLeft: "40px",
                    "&:hover": {
                      filter: "drop-shadow( 0 0 10px #dce85d)",
                      color: "#dce85d",
                    },
                  }}
                />
              </a>
              <PopUp />
            </div>
            <div className="flex items-center justify-end h-full">
              <span
                className="w-[120px] text-base h-full flex justify-center items-center"
                style={{
                  borderLeft: "solid rgba(227, 227, 227, 0.4) 1px",
                }}
              >
                <MouseOverPopover
                  title="solana transaction per second"
                  top={670}
                  left={1900}
                  solanaTransactionPerSecond={`TPS:- ${groupedNumberFormatter.format(Math.floor(tps))}`}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };

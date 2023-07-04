import { FC, useEffect } from "react";
import Slider from "@mui/material/Slider";
import { lendZoomLevel, denominationUSD } from "~/state";
import { useRecoilState } from "recoil";
import Switch from "@mui/material/Switch";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import MouseOverPopover from "../Modals/PopOver";
import PopUp from "../Modals/PopUp";

// const MyWebSocketComponent = () => {
//   useEffect(() => {
//     // Create a new WebSocket instance
//     const socket = new WebSocket("wss://stream.binance.com:9443/ws/solusdt@trade");

//     // WebSocket onOpen event handler
//     socket.onopen = () => {
//       console.log("WebSocket connection established.");
//     };

//     // WebSocket onMessage event handler
//     socket.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       console.log("Received data:", data);
//       // Handle the received data here, e.g., update the state with the data
//     };

//     // WebSocket onClose event handler
//     socket.onclose = () => {
//       console.log("WebSocket connection closed.");
//     };

//     // Clean up the WebSocket on component unmount
//     return () => {
//       socket.close();
//     };
//   }, []);

//   return <div>WebSocket example</div>;
// };

// export default MyWebSocketComponent;

const Footer: FC = () => {
  const [_, setZoom] = useRecoilState(lendZoomLevel);
  const [denomination, setDenominationUSD] = useRecoilState(denominationUSD);

  const zoomOnChange = (event: any) => {
    setZoom(event.target.value);
  };

  const denominationOnChange = (event: any) => {
    setDenominationUSD(event.target.checked);
  };

  return (
    <header>
      <div
        className="hidden xl:flex fixed w-full bottom-0 h-[34px] z-20"
        style={{
          backgroundColor: "#010101",
        }}
      >
        <div
          className="w-full bottom-0 flex justify-start items-center h-[34px] text-2xl z-10 px-8 gap-8"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="w-[60px] h-full max-h-full flex justify-center items-center">
            <Slider
              defaultValue={3}
              step={1}
              min={1}
              max={3}
              sx={{
                color: "rgb(227, 227, 227)",
                "& .MuiSlider-thumb": {
                  boxShadow: "0 0 0 8px rgba(227, 227, 227, 0.04)",
                  "&:hover": {
                    boxShadow: "0 0 0 8px rgba(227, 227, 227, 0.08)",
                  },
                },
              }}
              onChange={zoomOnChange}
            />
          </div>
          <div
            className="w-[90px] h-full max-h-full flex justify-center items-center"
            style={{
              borderLeft: "solid rgba(227, 227, 227, 0.4) 1px",
            }}
          >
            <Switch
              onChange={denominationOnChange}
              sx={{
                color: "#fff",
                "& .MuiSwitch-thumb": {
                  backgroundColor: "#fff",
                },
                "& .MuiSwitch-switchBase": {
                  "& + .MuiSwitch-track": {
                    backgroundColor: "#fff",
                    color: "#fff",
                    "&.Mui-checked": {
                      backgroundColor: "#fff",
                    },
                  },
                },
              }}
              checked={denomination}
            />
          </div>
          <div className="w-full h-full max-h-full flex justify-between items-center px-2">
            <div
              className="w-[120px] h-full max-h-full flex justify-between items-center px-6"
              style={{
                borderLeft: "solid rgba(227, 227, 227, 0.4) 1px",
              }}
            >
              <a target="_blank" href="https://docs.marginfi.com">
                <AutoStoriesOutlinedIcon
                  sx={{
                    fontSize: "18px",
                    "&:hover": {
                      boxShadow: "0px 0px 20px rgba(9, 194, 246, 0.4)",
                    },
                  }}
                />
              </a>
              <PopUp />
            </div>
            <div className="flex items-center justify-end h-full">
              <span
                className="w-[120px] text-base px-2 h-full flex justify-center items-center"
                style={{
                  borderLeft: "solid rgba(227, 227, 227, 0.4) 1px",
                }}
              >
                <MouseOverPopover title="solana transaction per second" top={670} left={1200} />
              </span>
              <span
                className="w-[120px] text-base px-2 h-full flex justify-center items-center"
                style={{
                  borderLeft: "solid rgba(227, 227, 227, 0.4) 1px",
                }}
              >
                <MouseOverPopover title="SOL price" top={670} left={1600} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export { Footer };

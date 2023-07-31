import React, { FC, useEffect, useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import HandymanIcon from "@mui/icons-material/Handyman";
import Slider from "@mui/material/Slider";
import { lendZoomLevel, denominationUSD } from "~/state";
import { useRecoilState } from "recoil";
import Switch from "@mui/material/Switch";
import Image from "next/image";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

const AppSettings: FC = () => {
  const [_, setZoom] = useRecoilState(lendZoomLevel);
  const [denomination, setDenominationUSD] = useRecoilState(denominationUSD);

  const zoomOnChange = (event: any) => {
    setZoom(event.target.value);
  };

  const denominationOnChange = (event: any) => {
    setDenominationUSD(event.target.checked);
  };
  return (
    <>
      {" "}
      <div className="relative flex items-center justify-center overflow-hidden">
        <div className="relative">
          <a href="#modal" target="_self" className="inline-flex items-center  px-4 py-2  text-white">
            <SettingsIcon
              sx={{
                fontSize: "18px",
                "&:hover": {
                  filter: "drop-shadow( 0 0 10px #dce85d)",
                  color: "#dce85d",
                },
              }}
            />
          </a>
        </div>
      </div>
      <div
        className="group invisible relative z-10 opacity-0 transition-all duration-300 target:visible target:opacity-100"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
        id="modal"
      >
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            {/*  Backdrop + Close on clicking outside */}
            <a
              href="#"
              target="_self"
              className="fixed inset-0 block cursor-default bg-black/50 bg-opacity-75 transition-opacity"
            >
              <span className="sr-only">Close Modal</span>
            </a>

            <div className=" relative scale-90 transform overflow-hidden rounded-lg bg-[#171c1f] text-left opacity-0 shadow-xl transition-all duration-300 group-target:scale-100 group-target:opacity-100 sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-[#171c1f] ">
                <div className="sm:flex sm:items-start">
                  <div className="w-full text-center sm:mt-0  sm:text-left">
                    <div className="py-4 border-[rgba(227, 227, 227, 0.4)] border-b w-full flex justify-between items-center">
                      <div className="flex items-center px-4">
                        <h3 className="text-lg font-medium leading-6 text-white mr-2" id="modal-title">
                          App Settings
                        </h3>
                        <SettingsIcon
                          sx={{
                            fontSize: "18px",
                          }}
                        />
                      </div>
                      <a
                        href="#"
                        target="_self"
                        className="inline-flex w-full justify-center  px-4 py-2 text-base font-medium text-white  sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        <CloseIcon
                          sx={{
                            fontSize: "18px",
                            "&:hover": {
                              filter: "drop-shadow( 0 0 10px #dce85d)",
                              color: "#dce85d",
                            },
                          }}
                        />
                      </a>
                    </div>

                    <div className="flex justify-between items-center my-4 px-4">
                      <div className="border-r border-[rgba(227, 227, 227, 0.4)] w-1/2">
                        <h3 className="text-sm font-medium leading-6 text-white uppercase tracking-widest mb-2">
                          Display
                        </h3>
                        <div>
                          <div className="flex items-center my-4">
                            <div className="w-[60px] h-full max-h-full flex justify-center items-center mr-4">
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
                            <div className="flex items-center mx-2">
                              <span className="text-sm text-white mx-2">Global pool Zoom Level</span>{" "}
                              <HtmlTooltip
                                title={
                                  <React.Fragment>
                                    <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                      Zoom Level
                                    </Typography>
                                    Adjust zoom levels in the asset list
                                  </React.Fragment>
                                }
                                placement="top"
                              >
                                <Image src="/info_icon.png" alt="info" height={16} width={16} />
                              </HtmlTooltip>
                            </div>
                          </div>
                          <div className="flex items-center my-4">
                            <div className="w-[60px] h-full max-h-full flex justify-center items-center mr-4">
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
                            <div className="flex items-center mx-2">
                              <span className="text-sm text-white mx-2">Denomination USD</span>{" "}
                              <HtmlTooltip
                                title={
                                  <React.Fragment>
                                    <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                      USD
                                    </Typography>
                                    Deposits, Global limit and Wallet Balance denoted by '$'
                                  </React.Fragment>
                                }
                                placement="top"
                              >
                                <Image src="/info_icon.png" alt="info" height={16} width={16} />
                              </HtmlTooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center items-center mx-auto">
                        {/* other addtional app settings  */}
                        <HandymanIcon
                          sx={{
                            fontSize: "18px",
                          }}
                        />{" "}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="py-2 flex justify-center items-center border-t border-[rgba(227, 227, 227, 0.4)]">
                <Image src="/marginfi_logo.png" alt="marginfi logo" height={18} width={18} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppSettings;

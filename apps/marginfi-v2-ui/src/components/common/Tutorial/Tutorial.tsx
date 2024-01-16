import React from "react";

import Link from "next/link";

import Switch from "@mui/material/Switch";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";

import { cn } from "~/utils";
import { UserMode } from "~/types";
import { useUiStore } from "~/store";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  IconMrgn,
  IconReceiveMoney,
  IconAlertTriangle,
  IconSettings,
  IconCheck,
  IconChevronRight,
  IconExternalLink,
  IconUserPlus,
  IconBrandX,
  IconBrandDiscordFilled,
} from "~/components/ui/icons";

type TutorialSlideProps = {
  icon?: React.ReactNode;
  heading?: string;
  next?: string;
  docs?: boolean;
  children: React.ReactNode;
  closeDialog?: () => void;
};

const TutorialSlide = ({ children, icon, heading, next, docs = false, closeDialog }: TutorialSlideProps) => {
  const swiper = useSwiper();

  const closeBtn = (
    <Button
      onClick={() => {
        if (closeDialog) closeDialog();
      }}
    >
      Get Started <IconCheck size={16} />
    </Button>
  );

  return (
    <div className="pb-16 px-4 space-y-4 md:space-y-8 h-full md:h-auto text-center">
      <header className="space-y-2 md:space-y-4 flex flex-col items-center">
        {icon && icon}
        {heading && <h2 className="text-3xl font-medium">{heading}</h2>}
      </header>
      {children}
      {!docs && next && (
        <div className="flex items-center justify-center">
          <Button
            className="w-full md:w-auto"
            onClick={() => {
              swiper.slideNext();
            }}
          >
            {next} <IconChevronRight size={16} />
          </Button>
        </div>
      )}
      {docs && (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Link href="https://docs.marginfi.com/" target="_blank" rel="noreferrer" className="block w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto">
              Read docs <IconExternalLink size={16} />
            </Button>
          </Link>
          {next && (
            <Button
              className="w-full md:w-auto"
              onClick={() => {
                swiper.slideNext();
              }}
            >
              {next} <IconChevronRight size={16} />
            </Button>
          )}
          {!next && closeBtn}
        </div>
      )}
      {!docs && !next && closeBtn}
    </div>
  );
};

export const Tutorial = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [proModeOnly, setProModeOnly] = React.useState(false);

  const handleDialogClose = () => {
    localStorage.setItem("mrgnTutorialAcknowledged", "true");
    localStorage.setItem("mrgnProModeAcknowledged", "true");
    setOpen(false);
  };

  React.useEffect(() => {
    if (!localStorage.getItem("mrgnTutorialAcknowledged")) {
      setOpen(true);
      return;
    }

    if (
      localStorage.getItem("mrgnTutorialAcknowledged") &&
      !localStorage.getItem("mrgnProModeAcknowledged") &&
      !isMobile
    ) {
      setProModeOnly(true);
      setOpen(true);
    }
  }, [isMobile]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
      >
        <DialogContent className={cn("p-4 md:py-8", proModeOnly ? "md:max-w-3xl" : "md:max-w-4xl")}>
          <div className="max-w-3xl">
            {proModeOnly && (
              <div className="pb-8 px-4 space-y-4 md:space-y-8 h-full md:h-auto text-center">
                <header className="space-y-2 md:space-y-4 flex flex-col items-center">
                  <IconSettings size={48} />
                  <h2 className="text-3xl font-medium">Choose your mode</h2>
                </header>
                <div className="space-y-6 md:space-y-10 pb-2 max-w-[30rem] mx-auto flex-col justify-center">
                  <p className="-translate-y-3">You can change the mode any time using the toolbar toggle.</p>
                  <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                    <div className="space-y-3 text-left">
                      <h2 className="text-xl font-medium relative">
                        Lite mode{" "}
                        <Badge className="-translate-y-1.5" variant="primary">
                          new
                        </Badge>
                      </h2>
                      <ul className="space-y-2">
                        <li className="flex gap-2">
                          <IconCheck size={20} className="text-chartreuse shrink-0" /> Quickly get started with lending
                          &amp; borrowing
                        </li>
                        <li className="flex gap-2">
                          <IconCheck size={20} className="text-chartreuse shrink-0" /> Simplified and minimized user
                          interface
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3 text-left">
                      <h2 className="text-xl font-medium">Pro mode</h2>
                      <ul className="space-y-2">
                        <li className="flex gap-2">
                          <IconCheck size={20} className="text-chartreuse shrink-0" /> Full table of global and isolated
                          pools
                        </li>
                        <li className="flex gap-2">
                          <IconCheck size={20} className="text-chartreuse shrink-0" /> Enhanced data &amp; advanced
                          features
                        </li>
                      </ul>
                    </div>
                  </div>
                  <UserModeControl />
                </div>
                <div className="flex items-center justify-center">
                  <Button
                    className="w-full md:w-auto"
                    onClick={() => {
                      setOpen(false);
                      localStorage.setItem("mrgnProModeAcknowledged", "true");
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            )}
            {!proModeOnly && (
              <Swiper modules={[Pagination]} slidesPerView={1} navigation pagination={{ clickable: true }}>
                <SwiperSlide className="h-full">
                  <TutorialSlide icon={<IconMrgn size={48} />} heading="Welcome to marginfi" next="Fees & yield">
                    <div className="space-y-6 md:space-y-8 pb-2 max-w-xl mx-auto flex flex-col justify-center">
                      <p>
                        marginfi is a decentralized lending protocol on Solana that prioritizes risk management to
                        provide a safe and reliable solution for users looking to access leverage and maximize capital
                        efficiency.
                      </p>
                      <p>
                        Today marginfi allows you to do two things: Lend tokens and earn yield on them. Borrow tokens
                        using tokens you&apos;ve lent as collateral.
                      </p>
                    </div>
                  </TutorialSlide>
                </SwiperSlide>
                <SwiperSlide className="h-full">
                  <TutorialSlide icon={<IconReceiveMoney size={48} />} heading="Fees & yield" next="Account health">
                    <div className="space-y-6 md:space-y-8 pb-2 max-w-[35rem] mx-auto flex flex-col justify-center">
                      <p>
                        marginfi allows users to lend tokens and earn interest. Interest is paid by borrowers to
                        lenders. All borrowing is over-collateralized.
                      </p>
                      <p>
                        Deposits in marginfi&apos;s Earn program may be locked according to the parameters of each
                        campaign. Campaigns can be created on marginfi by new teams looking to bootstrap liquidity for
                        their token.
                      </p>
                      <p>
                        Borrowers in marginfi pay interest specific to each asset. Both lending and borrowing interest
                        on marginfi is variable.
                      </p>
                    </div>
                  </TutorialSlide>
                </SwiperSlide>
                <SwiperSlide className="h-full">
                  <TutorialSlide
                    icon={<IconAlertTriangle size={48} />}
                    heading="Account health"
                    next="User modes"
                    docs={true}
                  >
                    <div className="space-y-6 md:space-y-8 pb-2 max-w-[44rem] mx-auto flex-col justify-center">
                      <p className="hidden tall:flex">
                        Account health is only for borrowing activity on marginfi. If you&apos;re not borrowing on
                        marginfi, you will always have 100% account health. Your account health is a single value that
                        encapsulates how well-collateralized your account is based on your borrowed liabilities.
                      </p>
                      <p className="text-sm sm:text-base flex font-bold mx-auto items-center gap-3 border border-solid border-white/50 px-4 py-2 rounded-lg">
                        <IconAlertTriangle height={20} className="hidden md:block" />
                        When your account health reaches 0% or below, you are exposed to liquidation.
                      </p>
                      <p>
                        When borrowed positions fall below configured margin requirements and your account health goes
                        to 0%, you are exposed to liquidation. Liquidations on marginfi are automatic and
                        permissionless. Liquidators can buy and sell assets once accounts reach 0% account health for
                        profit.
                      </p>
                    </div>
                  </TutorialSlide>
                </SwiperSlide>
                <SwiperSlide className="h-full">
                  <TutorialSlide icon={<IconSettings size={48} />} heading="Choose your mode" next="Follow marginfi">
                    <div className="space-y-6 md:space-y-10 pb-2 max-w-[30rem] mx-auto flex-col justify-center">
                      <p className="-translate-y-3">You can change the mode any time using the toolbar toggle.</p>
                      <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-16">
                        <div className="space-y-3 text-left">
                          <h2 className="text-xl font-medium relative">
                            Lite mode{" "}
                            <Badge className="-translate-y-1.5" variant="primary">
                              new
                            </Badge>
                          </h2>
                          <ul className="space-y-2">
                            <li className="flex gap-2">
                              <IconCheck size={20} className="text-chartreuse shrink-0" /> Quickly get started with
                              lending &amp; borrowing
                            </li>
                            <li className="flex gap-2">
                              <IconCheck size={20} className="text-chartreuse shrink-0" /> Simplified and minimized user
                              interface
                            </li>
                          </ul>
                        </div>
                        <div className="space-y-3 text-left">
                          <h2 className="text-xl font-medium">Pro mode</h2>
                          <ul className="space-y-2">
                            <li className="flex gap-2">
                              <IconCheck size={20} className="text-chartreuse shrink-0" /> Full table of global and
                              isolated pools
                            </li>
                            <li className="flex gap-2">
                              <IconCheck size={20} className="text-chartreuse shrink-0" /> Enhanced data &amp; advanced
                              features
                            </li>
                          </ul>
                        </div>
                      </div>
                      <UserModeControl />
                    </div>
                  </TutorialSlide>
                </SwiperSlide>
                <SwiperSlide className="h-full">
                  <TutorialSlide
                    icon={<IconUserPlus size={48} />}
                    heading="Follow marginfi"
                    closeDialog={handleDialogClose}
                  >
                    <div className="space-y-6 md:space-y-8 pb-2 max-w-[35rem] mx-auto flex-col justify-center">
                      <p>
                        Join the fastest growing crypto community and keep up with the latest industry news, product
                        releases, and alpha.
                      </p>
                      <ul className="flex items-center justify-center gap-3">
                        <li className="p-4 rounded-full bg-muted">
                          <a href="https://discord.gg/mrgn" target="_blank" rel="noreferrer">
                            <IconBrandDiscordFilled />
                          </a>
                        </li>
                        <li className="p-4 rounded-full bg-muted">
                          <a href="https://twitter.com/marginfi" target="_blank" rel="noreferrer">
                            <IconBrandX />
                          </a>
                        </li>
                      </ul>
                    </div>
                  </TutorialSlide>
                </SwiperSlide>
              </Swiper>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const UserModeControl = () => {
  const [userMode, setUserMode] = useUiStore((state) => [state.userMode, state.setUserMode]);

  return (
    <div className="text-[#868E95] whitespace-nowrap flex justify-center items-center">
      <div className="h-full flex justify-center items-center font-medium">Lite</div>
      <Switch
        size="medium"
        onChange={(_, checked) => setUserMode(checked ? UserMode.PRO : UserMode.LITE)}
        sx={{
          width: 70,
          height: 42,
          color: "#868E95",
          "& .MuiSwitch-thumb": {
            boxSizing: "border-box",
            height: 25,
            width: 25,
          },
          "& .MuiSwitch-switchBase": {
            "&.Mui-checked": {
              "& .MuiSwitch-thumb": {
                backgroundColor: "#DCE85D",
                transform: "translateX(5px)",
              },
              "& + .MuiSwitch-track": {
                backgroundColor: "#DCE85D",
                color: "#DCE85D",
              },
            },
            "& + .MuiSwitch-track": {
              backgroundColor: "#868E95",
            },
          },
        }}
        checked={userMode === UserMode.PRO}
      />
      <div className="h-full flex justify-center items-center font-medium">Pro</div>
    </div>
  );
};

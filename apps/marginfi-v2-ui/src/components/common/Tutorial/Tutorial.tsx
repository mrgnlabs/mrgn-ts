import React from "react";
import Link from "next/link";
import CloseIcon from "@mui/icons-material/Close";
import ArrowRight from "@mui/icons-material/ArrowRight";
import { Button, Dialog, DialogContent } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";
import { PWABanner } from "~/components/mobile/PWABanner";
import { IconMrgn, IconReceiveMoney, IconAlertTriangle } from "~/components/ui/icons";

type TutorialSlideProps = {
  icon?: React.ReactNode;
  heading?: string;
  next?: string;
  children: React.ReactNode;
  closeDialog?: () => void;
};

const TutorialSlide = ({ children, icon, heading, next, closeDialog }: TutorialSlideProps) => {
  const swiper = useSwiper();

  return (
    <div className="py-16 md:pb-20 md:pt-14 px-4 space-y-8 h-full md:h-auto">
      <header className="space-y-6 flex flex-col items-center">
        {icon && icon}
        {heading && <h2 className="text-3xl font-medium">{heading}</h2>}
      </header>
      {children}
      {next && (
        <div className="flex items-center justify-center">
          <Button
            variant="contained"
            className="bg-white text-black gap-2 flex items-center w-full md:w-auto"
            onClick={() => {
              swiper.slideNext();
            }}
          >
            {next} <ArrowRight />
          </Button>
        </div>
      )}
      {!next && (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Button
            variant="contained"
            className="bg-transparent text-white border border-solid border-white gap-2 flex items-center w-full md:w-auto"
          >
            <Link href="https://docs.marginfi.com/" target="_blank" rel="noreferrer">
              Read docs <OpenInNewIcon className="text-sm" />
            </Link>
          </Button>
          <Button
            variant="contained"
            className="bg-white text-black gap-2 flex items-center w-full md:w-auto"
            onClick={() => {
              if (closeDialog) closeDialog();
            }}
          >
            Get started
          </Button>
        </div>
      )}
    </div>
  );
};

export const Tutorial = () => {
  const [open, setOpen] = React.useState(false);
  const [pwaBannerOpen, setPwaBannerOpen] = React.useState(false);

  const handleDialogClose = () => {
    localStorage.setItem("tutorialAcknowledged", "true");
    setOpen(false);
    setPwaBannerOpen(true);
  };

  React.useEffect(() => {
    // if (!localStorage.getItem("tutorialAcknowledged")) {
    setOpen(true);
    // }
  }, []);

  return (
    <>
      <Dialog
        open={open}
        maxWidth="xl"
        slotProps={{
          backdrop: {
            style: {
              backdropFilter: "blur(4px)",
            },
          },
        }}
        PaperProps={{
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
            margin: 0,
          },
        }}
      >
        <DialogContent className="bg-[#0F1111] w-full rounded-lg text-white items-center justify-center text-center p-0">
          <div className="w-full max-w-4xl">
            <Swiper modules={[Pagination]} slidesPerView={1} navigation pagination={{ clickable: true }}>
              <SwiperSlide className="h-full">
                <TutorialSlide icon={<IconMrgn size={48} />} heading="Welcome to marginfi" next="Fees & yield">
                  <div className="space-y-8 pb-2 max-w-xl mx-auto flex flex-col justify-center">
                    <p>
                      marginfi is a decentralized lending protocol on Solana that prioritizes risk management to provide
                      a safe and reliable solution for users looking to access leverage and maximize capital efficiency.
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
                  <div className="space-y-8 pb-2 max-w-[35rem] mx-auto flex flex-col justify-center">
                    <p>
                      marginfi allows users to lend tokens and earn interest. Interest is paid by borrowers to lenders.
                      All borrowing is over-collateralized.
                    </p>
                    <p>
                      Deposits in marginfi&apos;s Earn program may be locked according to the parameters of each
                      campaign. Campaigns can be created on marginfi by new teams looking to bootstrap liquidity for
                      their token.
                    </p>
                    <p>
                      Borrowers in marginfi pay interest specific to each asset. Both lending and borrowing interest on
                      marginfi is variable.
                    </p>
                  </div>
                </TutorialSlide>
              </SwiperSlide>
              <SwiperSlide className="h-full">
                <TutorialSlide
                  icon={<IconAlertTriangle size={48} />}
                  heading="Account health"
                  closeDialog={handleDialogClose}
                >
                  <div className="space-y-8 pb-2 max-w-[44rem] mx-auto flex flex-col justify-center">
                    <p>
                      Account health is only for borrowing activity on marginfi. If you&apos;re not borrowing on
                      marginfi, you will always have 100% account health. Your account health is a single value that
                      encapsulates how well-collateralized your account is based on your borrowed liabilities.
                    </p>
                    <p className="font-bold mx-auto flex items-center gap-3 border border-solid border-white/50 px-4 py-2 rounded-lg">
                      <IconAlertTriangle height={20} className="hidden md:block" />
                      When your account health reaches 0% or below, you are exposed to liquidation.
                    </p>
                    <p>
                      When borrowed positions fall below configured margin requirements and your account health goes to
                      0%, you are exposed to liquidation. Liquidations on marginfi are automatic and permissionless.
                      Liquidators can buy and sell assets once accounts reach 0% account health for profit.
                    </p>
                  </div>
                </TutorialSlide>
              </SwiperSlide>
            </Swiper>
            <CloseIcon className="absolute top-4 right-4 cursor-pointer z-20 opacity-75" onClick={handleDialogClose} />
          </div>
        </DialogContent>
      </Dialog>
      <PWABanner open={pwaBannerOpen} onOpenChange={(open) => setPwaBannerOpen(open)} />
    </>
  );
};

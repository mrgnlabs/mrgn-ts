import React from "react";
import Link from "next/link";
import CloseIcon from "@mui/icons-material/Close";
import ArrowRight from "@mui/icons-material/ArrowRight";
import { Button, Dialog, DialogContent } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";
import { Mrgn, ReceiveMoney, Alert } from "~/components/common/icons";

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
    <div className="py-16 md:py-20 px-4 space-y-8 h-full md:h-auto">
      <header className="space-y-6 flex flex-col items-center">
        {icon && icon}
        {heading && <h2 className="text-3xl font-medium">{heading}</h2>}
      </header>
      {children}
      {next && (
        <Button
          variant="contained"
          className="bg-white text-black"
          onClick={() => {
            swiper.slideNext();
          }}
        >
          Next ({next}) <ArrowRight />
        </Button>
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
  const [open, setOpen] = React.useState(true);
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
      }}
      maxWidth="xl"
      PaperProps={{
        style: {
          backgroundColor: "transparent",
          boxShadow: "none",
          margin: 0,
        },
      }}
    >
      <DialogContent className="bg-[#171C1F] w-full rounded-lg text-white items-center justify-center text-center p-0">
        <div className="w-full max-w-4xl">
          <Swiper
            modules={[Pagination]}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            onSlideChange={() => console.log("slide change")}
            onSwiper={(swiper) => console.log(swiper)}
          >
            <SwiperSlide className="h-full">
              <TutorialSlide icon={<Mrgn color="#fff" height={48} />} heading="Welcome to marginfi" next="Fees & yield">
                <div className="space-y-8 pb-2 max-w-xl mx-auto flex flex-col justify-center">
                  <p>
                    marginfi is a decentralized lending protocol on Solana that prioritizes risk management to provide a
                    safe and reliable solution for users looking to access leverage and maximize capital efficiency.
                  </p>
                  <p>
                    Today, marginfi allows you to do two things: Lend tokens and earn yield on them Borrow tokens, using
                    tokens you've lent as collateral.
                  </p>
                </div>
              </TutorialSlide>
            </SwiperSlide>
            <SwiperSlide className="h-full">
              <TutorialSlide
                icon={<ReceiveMoney color="#fff" height={48} />}
                heading="Fees & yield"
                next="Account health"
              >
                <div className="space-y-8 pb-2 max-w-[41.8rem] mx-auto flex flex-col justify-center">
                  <p>
                    marginfi allows users to deposit supported tokens into the protocol and earn yield on them. This is
                    made possible by lenders on the platform who borrow these tokens and pay interest on them.
                  </p>
                  <p>
                    Deposits into marginfi's LIP program may be locked up depending on the LIP campaign they're
                    deposited to, which is available to users in each LIP campaign configuration and can only be set
                    when a campaign is initially created.
                  </p>
                  <p>
                    Borrowing on marginfi incurs a fee. Fees are specific to each asset that marginfi supports, usually
                    expressed in terms of APR (Annual Percentage Rate).
                  </p>
                </div>
              </TutorialSlide>
            </SwiperSlide>
            <SwiperSlide className="h-full">
              <TutorialSlide
                icon={<Alert color="#fff" height={48} />}
                heading="Account health"
                closeDialog={() => setOpen(false)}
              >
                <div className="space-y-8 pb-2 max-w-[44rem] mx-auto flex flex-col justify-center">
                  <p>
                    Every account's health is represented as a health factor. Your account health factor is a single
                    value that encapsulates how well-collateralized your portfolio is.
                  </p>
                  <p className="font-bold mx-auto flex items-center gap-3 border border-solid border-white/50 px-4 py-2 rounded-lg">
                    <Alert height={20} className="hidden md:block" />
                    When your account health reaches 0% or below, you are exposed to liquidation.
                  </p>
                  <p>
                    When borrowed trader positions fall below configured margin requirements, they are exposed to
                    liquidation. Liquidations on marginfi are automatic and permissionless, executed by third-party
                    liquidators who provide this service for a return, and marginfi awards a fee for successful
                    liquidations.
                  </p>
                </div>
              </TutorialSlide>
            </SwiperSlide>
          </Swiper>
        </div>
        <CloseIcon className="absolute top-4 right-4 cursor-pointer z-20 opacity-75" onClick={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

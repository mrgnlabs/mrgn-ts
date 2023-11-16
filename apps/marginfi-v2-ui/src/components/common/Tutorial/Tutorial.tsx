import React from "react";

import Link from "next/link";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";

import { useUiStore } from "~/store";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  IconMrgn,
  IconReceiveMoney,
  IconAlertTriangle,
  IconChevronRight,
  IconExternalLink,
  IconCheck,
  IconUserPlus,
  IconBrandX,
  IconBrandTelegram,
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
  const [setIsWalletOpen] = useUiStore((state) => [state.setIsWalletOpen]);
  const swiper = useSwiper();

  const closeBtn = (
    <Button
      className="w-full md:w-auto"
      onClick={() => {
        if (closeDialog) closeDialog();
        setIsWalletOpen(true);
      }}
    >
      Get started <IconCheck size={16} />
    </Button>
  );

  return (
    <div className="pb-16 px-4 space-y-4 md:space-y-8 h-full md:h-auto text-center">
      <header className="space-y-2 md:space-y-6 flex flex-col items-center">
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
  const [open, setOpen] = React.useState(true);

  const handleDialogClose = () => {
    localStorage.setItem("mrgnTutorialAcknowledged", "true");
    setOpen(false);
  };

  React.useEffect(() => {
    if (!localStorage.getItem("mrgnTutorialAcknowledged")) {
      setOpen(true);
    }
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
      >
        <DialogContent className="p-4 md:max-w-4xl md:py-8">
          <div className="max-w-3xl">
            <Swiper modules={[Pagination]} slidesPerView={1} navigation pagination={{ clickable: true }}>
              <SwiperSlide className="h-full">
                <TutorialSlide icon={<IconMrgn size={48} />} heading="Welcome to marginfi" next="Fees & yield">
                  <div className="space-y-6 md:space-y-8 pb-2 max-w-xl mx-auto flex flex-col justify-center">
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
                  <div className="space-y-6 md:space-y-8 pb-2 max-w-[35rem] mx-auto flex flex-col justify-center">
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
                  next="Follow marginfi"
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
                      When borrowed positions fall below configured margin requirements and your account health goes to
                      0%, you are exposed to liquidation. Liquidations on marginfi are automatic and permissionless.
                      Liquidators can buy and sell assets once accounts reach 0% account health for profit.
                    </p>
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
                        <a href="https://t.me/mrgncommunity" target="_blank" rel="noreferrer">
                          <IconBrandTelegram />
                        </a>
                      </li>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

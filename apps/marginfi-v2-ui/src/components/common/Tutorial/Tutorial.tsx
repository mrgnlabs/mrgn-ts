import React from "react";

import Link from "next/link";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";

import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  IconMrgn,
  IconCheck,
  IconChevronRight,
  IconExternalLink,
  IconBrandX,
  IconBrandDiscordFilled,
  IconMoneybag,
  IconBuildingBank,
  IconBrandSubstack,
} from "~/components/ui/icons";

type TutorialSlideProps = {
  icon?: React.ReactNode;
  heading?: string;
  next?: string;
  docs?: boolean;
  children: React.ReactNode;
  closeDialog?: () => void;
  showSkip?: boolean;
};

const TutorialSlide = ({
  children,
  icon,
  heading,
  next,
  docs = false,
  closeDialog,
  showSkip = false,
}: TutorialSlideProps) => {
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
      {showSkip && (
        <Button
          variant="outline"
          className="mt-4 w-full md:hidden"
          onClick={() => {
            if (closeDialog) closeDialog();
          }}
        >
          Skip
        </Button>
      )}
      {!docs && !next && closeBtn}
    </div>
  );
};

export const Tutorial = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const handleDialogClose = () => {
    localStorage.setItem("mrgnTutorialAcknowledged", "true");
    setOpen(false);
  };

  React.useEffect(() => {
    if (!localStorage.getItem("mrgnTutorialAcknowledged")) {
      setOpen(true);
      return;
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
        <DialogContent className="p-4 md:py-8 md:max-w-4xl">
          <div className="max-w-3xl">
            <Swiper modules={[Pagination]} slidesPerView={1} navigation pagination={{ clickable: true }}>
              <SwiperSlide className="h-full">
                <TutorialSlide
                  icon={<IconMrgn size={48} />}
                  heading="Welcome to marginfi"
                  next="Earn Yield"
                  closeDialog={handleDialogClose}
                  showSkip={true}
                >
                  <div className="space-y-4 pb-2 max-w-xl mx-auto flex flex-col justify-center">
                    <p>marginfi is a protocol on Solana focused on safety, transparency, and flexibility.</p>
                    <p>
                      If you&apos;re a developer looking to integrate with marginfi,{" "}
                      <Link
                        href="https://docs.marginfi.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 group leading-5"
                      >
                        <span className="border-b border-muted-foreground transition group-hover:border-transparent">
                          read our docs here
                        </span>{" "}
                        <IconExternalLink size={14} />
                      </Link>
                    </p>
                  </div>
                </TutorialSlide>
              </SwiperSlide>
              <SwiperSlide className="h-full">
                <TutorialSlide icon={<IconMoneybag size={48} />} heading="Earn Yield" next="Safety and Use">
                  <div className="space-y-4 pb-2 max-w-[32rem] mx-auto flex flex-col justify-center">
                    <p>
                      marginfi enables you to permissionlessly earn variable yield,
                      <br className="hidden md:block" /> paid to you by borrowers.
                    </p>
                    <p>
                      There are no middlemen. marginfi users come from all over the world,
                      <br className="hidden md:block" /> unblocked from traditional finance rails.
                    </p>
                  </div>
                </TutorialSlide>
              </SwiperSlide>
              <SwiperSlide className="h-full">
                <TutorialSlide icon={<IconBuildingBank size={48} />} heading="Safety and Use" next="Follow marginfi">
                  <div className="space-y-6 md:space-y-8 pb-2 max-w-[40rem] mx-auto flex-col justify-center">
                    <p>
                      marginfi is an{" "}
                      <Link
                        href="https://github.com/mrgnlabs/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 group leading-5"
                      >
                        <span className="border-b border-muted-foreground transition group-hover:border-transparent">
                          open source
                        </span>{" "}
                        <IconExternalLink size={14} />
                      </Link>
                      ,{" "}
                      <Link
                        href="https://github.com/mrgnlabs/marginfi-v2/tree/main/audits/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 group leading-5"
                      >
                        <span className="border-b border-muted-foreground transition group-hover:border-transparent">
                          double audited
                        </span>{" "}
                        <IconExternalLink size={14} />
                      </Link>
                      , and{" "}
                      <Link
                        href="https://github.com/mrgnlabs/marginfi-v2/blob/main/scripts/verify.sh"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 group leading-5"
                      >
                        <span className="border-b border-muted-foreground transition group-hover:border-transparent">
                          code-verified
                        </span>{" "}
                        <IconExternalLink size={14} />
                      </Link>{" "}
                      protocol.
                      <br className="hidden md:block" /> Anyone can build new applications that benefit from
                      marginfi&apos;s resources.
                    </p>
                  </div>
                </TutorialSlide>
              </SwiperSlide>
              <SwiperSlide className="h-full">
                <TutorialSlide icon={<IconMrgn size={48} />} heading="Follow marginfi" closeDialog={handleDialogClose}>
                  <div className="space-y-6 md:space-y-8 pb-2 max-w-[30rem] mx-auto flex-col justify-center">
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
                      <li className="p-4 rounded-full bg-muted">
                        <a href="https://mrgn.substack.com/" target="_blank" rel="noreferrer">
                          <IconBrandSubstack />
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

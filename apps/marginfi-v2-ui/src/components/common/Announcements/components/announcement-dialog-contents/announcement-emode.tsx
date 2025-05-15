import React from "react";
import { IconBolt, IconChevronRight, IconCheck } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";

type TutorialSlideProps = {
  icon?: React.ReactNode;
  heading?: string;
  next?: string;
  children: React.ReactNode;
  closeDialog?: () => void;
  showSkip?: boolean;
};

const TutorialSlide = ({ children, icon, heading, next, closeDialog, showSkip = false }: TutorialSlideProps) => {
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
      {next && (
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
      {!next && closeBtn}
      {showSkip && (
        <Button
          variant="outline-dark"
          className="mt-4 w-full md:hidden"
          onClick={() => {
            if (closeDialog) closeDialog();
          }}
        >
          Skip
        </Button>
      )}
    </div>
  );
};

const AnnouncementEmode = () => {
  return (
    <div className="w-full">
      <Swiper modules={[Pagination]} slidesPerView={1} navigation pagination={{ clickable: true }}>
        <SwiperSlide className="h-full">
          <TutorialSlide
            icon={<IconBolt size={48} className="text-purple-300" />}
            heading="Introducing e-mode"
            next="What is e-mode?"
          >
            <div className="space-y-2">
              <p>
                We&apos;re excited to introduce e-mode, a new feature that allows you to maximize your borrowing power.
              </p>
              <p>Learn how to leverage e-mode to optimize your lending and borrowing strategies.</p>
            </div>
          </TutorialSlide>
        </SwiperSlide>
        <SwiperSlide className="h-full">
          <TutorialSlide
            icon={<IconBolt size={48} className="text-purple-300" />}
            heading="What is e-mode?"
            next="Boosted Pairings"
          >
            <div className="space-y-6">
              <p>
                e-mode is an efficiency mode that allows you to borrow assets <br className="hidden md:block" /> with
                higher collateral efficiency when they are in the same asset category.
              </p>
              <p>
                This means you can borrow more with the same amount of collateral,
                <br className="hidden md:block" /> maximizing your capital efficiency.
              </p>
            </div>
          </TutorialSlide>
        </SwiperSlide>
        <SwiperSlide className="h-full">
          <TutorialSlide icon={<IconBolt size={48} className="text-purple-300" />} heading="Boosted Pairings">
            <div className="flex flex-col gap-4">
              <p>eThese pairings allow for higher borrowing power while maintaining the same level of safety:</p>
              <ul className="space-y-2 mx-auto text-center">
                <li>Stablecoins (USDC, USDT, etc.)</li>
                <li>ETH and stETH</li>
                <li>BTC and wBTC</li>
              </ul>
            </div>
          </TutorialSlide>
        </SwiperSlide>
      </Swiper>
    </div>
  );
};

export { AnnouncementEmode };

"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, EffectFade } from "swiper/modules";
import { useSwiper } from "swiper/react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { IconEmode, IconEmodeSimple, IconEmodeSimpleInactive } from "~/components/ui/icons";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { EmodePair } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { EmodeTable } from "~/components/common/emode/components/emode-table";
import { useEmode, useExtendedBanks } from "@mrgnlabs/mrgn-state";

type AnnouncementSlideProps = {
  title: string;
  description?: string;
  features?: string[];
  video?: string;
  isFirst?: boolean;
  isLast?: boolean;
  nextSlideTitle?: string;
  prevSlideTitle?: string;
  onClose?: () => void;
  currentSlide: number;
  totalSlides: number;
  userActiveEmodes: EmodePair[];
  connected: boolean;
  banks: ExtendedBankInfo[];
  tableResetKey?: number;
};

enum UserStatus {
  DISCONNECTED = "disconnected",
  EMODE_ENABLED = "e-mode enabled",
  EMODE_DISABLED = "e-mode disabled",
}

const AnnouncementSlide = ({
  title,
  description,
  features,
  video,
  isFirst = false,
  isLast = false,
  nextSlideTitle,
  prevSlideTitle,
  onClose,
  currentSlide,
  totalSlides,
  userActiveEmodes,
  connected,
  banks,
  tableResetKey,
}: AnnouncementSlideProps) => {
  const swiper = useSwiper();

  const userStatus = React.useMemo(() => {
    if (!connected) {
      return UserStatus.DISCONNECTED;
    }
    if (userActiveEmodes.length > 0) {
      return UserStatus.EMODE_ENABLED;
    }
    return UserStatus.EMODE_DISABLED;
  }, [connected, userActiveEmodes]);

  const isTableSlide = title === "Explore e-mode pairs";

  return (
    <div className="flex flex-col lg:flex-row h-max min-h-[770px] md:min-h-0 md:h-full">
      {/* Video Panel - Top on mobile, Left on desktop */}
      <div className="flex-1 bg-gradient-to-br flex items-start md:items-center justify-center relative overflow-hidden max-h-[430px] max-w-[430px] md:max-h-full md:max-w-full">
        <div className="z-10 flex items-center justify-center h-full w-full md:relative ">
          {video && (
            <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
              <source src={`${video}.webm`} type="video/webm" />
              <source src={`${video}.mp4`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        {/* Pagination dots */}
        <div className="absolute hidden md:block bottom-6 md:bottom-4 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex space-x-2 items-center">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => swiper?.slideTo(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-white w-8 h-2" : "bg-white/30 w-2 h-2 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content Panel - Bottom on mobile, Right on desktop */}
      <div className="flex-1 p-6 lg:p-12 flex flex-col justify-between">
        {/* Content */}
        <div className="flex-1 flex flex-col pt-8 space-y-6 lg:pt-0 lg:space-y-12 lg:justify-center">
          <div className="space-y-3 lg:space-y-4">
            <h1 className="text-2xl lg:text-4xl font-medium flex items-center gap-2 lg:gap-3">
              {!isLast && title}
              {isFirst && (
                <div className="flex items-center gap-1 lg:gap-1.5 text-mfi-emode">
                  <IconEmode size={32} className="lg:w-[42px] lg:h-[42px]" />
                  <span className="text-mfi-emode text-xl lg:text-4xl">e-mode</span>
                </div>
              )}
              {isLast && userStatus === UserStatus.EMODE_ENABLED && (
                <div className="flex items-center gap-1 lg:gap-1.5">
                  <IconEmode size={32} className="lg:w-[42px] lg:h-[42px]" />
                  <span className="text-xl lg:text-4xl">e-mode enabled!</span>
                </div>
              )}
              {isLast && userStatus === UserStatus.EMODE_DISABLED && (
                <div className="flex items-center gap-1 lg:gap-1.5">
                  <IconEmodeSimpleInactive size={32} className="lg:w-[42px] lg:h-[42px]" />
                  <span className="text-xl lg:text-4xl">e-mode inactive</span>
                </div>
              )}
              {isLast && userStatus === UserStatus.DISCONNECTED && (
                <div className="flex items-center gap-1 lg:gap-1.5">
                  <IconEmodeSimpleInactive size={32} className="lg:w-[42px] lg:h-[42px]" />
                  <span className="text-xl lg:text-4xl">{title}</span>
                </div>
              )}
            </h1>
            {!isLast && !isTableSlide && description && (
              <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">{description}</p>
            )}
            {isTableSlide && (
              <div className="space-y-8">
                <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">{description}</p>
                <EmodeTable
                  className="max-h-[300px] overflow-auto"
                  align="left"
                  showTag={false}
                  resetKey={tableResetKey || 1}
                />
              </div>
            )}
            {isLast && (
              <>
                {userStatus === UserStatus.EMODE_ENABLED && (
                  <div className="space-y-6">
                    <div className="w-[80%]">
                      Your portfolio currently has{" "}
                      <div className="inline-flex items-center translate-y-1 gap-0.5">
                        <IconEmodeSimple size={18} /> <span className="text-mfi-emode mr-1">e-mode</span>
                      </div>{" "}
                      enabled for the following pairs.
                    </div>
                    <div className="space-y-2">
                      {userActiveEmodes.map((emode, index) => {
                        const collatBanks = banks
                          .filter((bank) =>
                            emode.collateralBanks.map((pk) => pk.toBase58()).includes(bank.address.toBase58())
                          )
                          .filter((bank) => bank.isActive && bank.position.isLending);
                        const liabBank = banks.find((bank) => bank.address.equals(emode.liabilityBank));
                        return (
                          <div key={index}>
                            {collatBanks.map((bank) => {
                              if (!liabBank || liabBank.address.equals(bank.address)) return null;
                              return (
                                <div
                                  key={bank.address.toBase58()}
                                  className="flex items-center gap-2 text-muted-foreground"
                                >
                                  <div className="flex items-center gap-1.5 text-foreground">
                                    <Image
                                      src={bank.meta.tokenLogoUri}
                                      alt={bank.meta.tokenSymbol}
                                      width={18}
                                      height={18}
                                      className="rounded-full"
                                    />
                                    {bank.meta.tokenSymbol}
                                  </div>
                                  /
                                  <div className="flex items-center gap-1.5 text-foreground">
                                    <Image
                                      src={liabBank?.meta.tokenLogoUri}
                                      alt={liabBank?.meta.tokenSymbol}
                                      width={18}
                                      height={18}
                                      className="rounded-full"
                                    />
                                    {liabBank?.meta.tokenSymbol}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {userStatus === UserStatus.EMODE_DISABLED && (
                  <div>
                    <p className="flex items-center gap-1">
                      Your portfolio currently has <IconEmodeSimpleInactive size={18} /> <span>e-mode disabled</span>.
                    </p>
                    <p>Explore the e-mode pairs for increased borrowing power.</p>
                  </div>
                )}
                {userStatus === UserStatus.DISCONNECTED && (
                  <div className="text-base lg:text-lg text-muted-foreground leading-relaxed">{description}</div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2 lg:space-y-3">
            {features &&
              features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 lg:gap-3 shrink-0">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-background-gray-light flex items-center justify-center shrink-0">
                    <IconEmodeSimpleInactive size={18} />
                  </div>
                  <span className="text-sm lg:text-base">{feature}</span>
                </div>
              ))}

            {isLast && (
              <div className="flex items-center gap-4 pt-4">
                <Button className="w-full" onClick={() => onClose?.()}>
                  Get Started
                </Button>
                <Link
                  href="https://docs.marginfi.com/emode"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="secondary" className="w-full">
                    View Documentation
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className={cn("flex justify-between items-center", !isTableSlide && "pt-4 lg:pt-8")}>
          <Button
            variant="ghost"
            onClick={() => swiper?.slidePrev()}
            className="flex items-center gap-1 lg:gap-2 text-muted-foreground hover:text-foreground text-sm lg:text-base"
            disabled={isFirst}
          >
            <IconChevronLeft size={14} className="lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">{prevSlideTitle}</span>
          </Button>

          <div className="flex space-x-2 items-center md:hidden">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => swiper?.slideTo(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-white w-8 h-2" : "bg-white/30 w-2 h-2 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={() => swiper?.slideNext()}
            className="flex items-center gap-1 lg:gap-2 text-muted-foreground hover:text-foreground text-sm lg:text-base"
            disabled={isLast}
          >
            <span className="hidden sm:inline">{nextSlideTitle}</span>
            <IconChevronRight size={14} className="lg:w-4 lg:h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

type AnnouncementEmodeProps = {
  onClose?: () => void;
};

const AnnouncementEmode = ({ onClose }: AnnouncementEmodeProps) => {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [tableResetKey, setTableResetKey] = React.useState(1);
  const { connected } = useWallet();
  const { extendedBanks } = useExtendedBanks();
  const { activeEmodePairs } = useEmode();

  const prevSlideRef = React.useRef(currentSlide);

  const slides = [
    {
      title: "Introducing",
      description: "e-mode (efficiency mode) allows you to borrow more against your collateral for correlated pairs.",
      features: ["Boosted collateral weights", "Incrased borrowing power", "Maximize your leverage"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/1",
      nextSlideTitle: "Boosted weights",
    },
    {
      title: "Increased borrow power",
      description: "Higher collateral weight means more value counted toward your borrow limit.",
      features: ["Boost your collateral weights", "Borrow more against correlated pairs"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/3",
      prevSlideTitle: "Introducing e-mode",
      nextSlideTitle: "Maximize leverage",
    },
    {
      title: "Maximize your leverage",
      description: "Take on higher leverage thanks to boosted collateral values for correlated assets.",
      features: ["Improved collateral efficiency", "Maximize your leverage"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/1",
      prevSlideTitle: "Strategy",
      nextSlideTitle: "Explore e-mode pairs",
    },
    {
      title: "Explore e-mode pairs",
      description: "Explore e-mode pairs and their boosted collateral weights for increased borrowing power.",
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/3",
      prevSlideTitle: "Maximize your leverage",
      nextSlideTitle: "Get started",
    },
    {
      title: "Get started!",
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/3",
      prevSlideTitle: "Benefits",
      description: "Maximize your capital efficiency — start using e-mode today.",
    },
  ];

  return (
    <div className="w-screen h-max lg:w-full lg:h-[600px] lg:rounded-lg overflow-hidden bg-background-gray">
      <Swiper
        modules={[Pagination, Navigation, EffectFade]}
        slidesPerView={1}
        effect="fade"
        fadeEffect={{
          crossFade: true,
        }}
        speed={300}
        onSlideChange={(swiper) => {
          const newSlideIndex = swiper.activeIndex;
          if (
            prevSlideRef.current >= 0 &&
            prevSlideRef.current < slides.length &&
            newSlideIndex >= 0 &&
            newSlideIndex < slides.length
          ) {
            const wasTableSlide = slides[prevSlideRef.current].title === "Explore e-mode pairs";

            if (wasTableSlide) {
              setTableResetKey((prev) => prev + 1);
            }
          }

          setCurrentSlide(newSlideIndex);
          prevSlideRef.current = newSlideIndex;
        }}
        className="h-full flex flex-col md:block"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index} className="h-full flex flex-col md:block">
            <AnnouncementSlide
              title={slide.title}
              description={slide.description}
              features={slide.features}
              video={slide.video}
              isFirst={index === 0}
              isLast={index === slides.length - 1}
              nextSlideTitle={slide.nextSlideTitle}
              prevSlideTitle={slide.prevSlideTitle}
              onClose={onClose}
              currentSlide={currentSlide}
              totalSlides={slides.length}
              userActiveEmodes={activeEmodePairs}
              connected={connected}
              banks={extendedBanks}
              tableResetKey={tableResetKey}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export { AnnouncementEmode };

"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, EffectFade } from "swiper/modules";
import { useSwiper } from "swiper/react";
import { IconX, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { useMrgnlendStore } from "~/store";
import { Button } from "~/components/ui/button";
import { IconEmode, IconEmodeSimple, IconEmodeSimpleInactive } from "~/components/ui/icons";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { EmodePair } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

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

  return (
    <div className="flex flex-col lg:flex-row h-full bg-background">
      {/* Video Panel - Top on mobile, Left on desktop */}
      <div className="flex-1 bg-gradient-to-br flex items-center justify-center relative overflow-hidden">
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {video && (
            <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
              <source src={`${video}.webm`} type="video/webm" />
              <source src={`${video}.mp4`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
        {/* Pagination dots */}
        <div className="absolute bottom-4 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-20">
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
            {!isLast && description && (
              <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">{description}</p>
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
                    {userActiveEmodes.map((emode, index) => {
                      const collatBanks = banks
                        .filter((bank) =>
                          emode.collateralBanks.map((pk) => pk.toBase58()).includes(bank.address.toBase58())
                        )
                        .filter((bank) => bank.isActive);
                      const liabBank = banks.find((bank) => bank.address.equals(emode.liabilityBank));
                      return (
                        <div key={index} className="space-y-2">
                          {collatBanks.map((bank) => {
                            if (!liabBank) return null;
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
                    <IconEmodeSimpleInactive size={18} className="lg:w-6 lg:h-6" />
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
        <div className="flex justify-between items-center pt-4 lg:pt-8">
          {!isFirst && (
            <Button
              variant="ghost"
              onClick={() => swiper?.slidePrev()}
              className="flex items-center gap-1 lg:gap-2 text-muted-foreground hover:text-foreground text-sm lg:text-base"
            >
              <IconChevronLeft size={14} className="lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">{prevSlideTitle}</span>
            </Button>
          )}

          {!isLast && (
            <Button
              variant="ghost"
              onClick={() => swiper?.slideNext()}
              className="flex items-center gap-1 lg:gap-2 text-muted-foreground ml-auto hover:text-foreground text-sm lg:text-base"
            >
              <span className="hidden sm:inline">{nextSlideTitle}</span>
              <IconChevronRight size={14} className="lg:w-4 lg:h-4" />
            </Button>
          )}
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
  const { connected } = useWallet();
  const [userActiveEmodes, extendedBankInfos] = useMrgnlendStore((state) => [
    state.userActiveEmodes,
    state.extendedBankInfos,
  ]);

  const slides = [
    {
      title: "Introducing",
      description:
        "We're excited to announce e-mode! Boosted weights and increased borrowing power for correlated assets.",
      features: ["Boosted collateral weights", "Incrased borrowing power", "Maximize your leverage"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/1",
      nextSlideTitle: "Boosted weights",
    },
    {
      title: "Increased borrow power",
      description: "e-mode will apply boosted weights for correlated pairs, meaning increased borrowing power.",
      features: ["Boost your collateral weights", "Borrow more against correlated pairs"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/3",
      prevSlideTitle: "Introducing e-mode",
      nextSlideTitle: "Maximize leverage",
    },
    {
      title: "Maximize your leverage",
      description: "Experience improved capital efficiency and increased leverage for e-mode enabled pairs.",
      features: ["Improved collateral efficiency", "Maximize your leverage"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/1",
      prevSlideTitle: "Strategy",
      nextSlideTitle: "Get Started",
    },
    {
      title: "Get started!",
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/3",
      prevSlideTitle: "Benefits",
      description: "Connect your wallet to explore e-mode pairs for increased borrowing power and maximized leverage.",
    },
  ];

  return (
    <div className="w-screen h-screen lg:w-full lg:h-[600px] lg:rounded-lg overflow-hidden bg-background">
      <Swiper
        modules={[Pagination, Navigation, EffectFade]}
        slidesPerView={1}
        effect="fade"
        fadeEffect={{
          crossFade: true,
        }}
        speed={300}
        onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
        className="h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index} className="h-full">
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
              userActiveEmodes={userActiveEmodes}
              connected={connected}
              banks={extendedBankInfos}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export { AnnouncementEmode };

"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, EffectFade } from "swiper/modules";
import { useSwiper } from "swiper/react";
import { IconX, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";
import { IconEmode, IconEmodeSimpleInactive } from "~/components/ui/icons";

type AnnouncementSlideProps = {
  title: string;
  description: string;
  features: string[];
  video?: string;
  isFirst?: boolean;
  isLast?: boolean;
  nextSlideTitle?: string;
  prevSlideTitle?: string;
  onClose?: () => void;
  currentSlide: number;
  totalSlides: number;
};

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
}: AnnouncementSlideProps) => {
  const swiper = useSwiper();

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Image or Video */}
      <div className="flex-1 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
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
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
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

      {/* Right Panel - Content */}
      <div className="flex-1 p-12 flex flex-col justify-between">
        {/* Close button */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <IconX size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-medium flex items-center gap-3">
              {title}
              {isFirst && (
                <div className="flex items-center gap-1.5 text-mfi-emode">
                  <IconEmode size={42} />
                  <span className="text-mfi-emode">e-mode</span>
                </div>
              )}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
          </div>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-background-gray-light flex items-center justify-center shrink-0">
                  <IconEmodeSimpleInactive size={24} />
                </div>
                <span className="text-base">{feature}</span>
              </div>
            ))}

            {isLast && (
              <div className="pt-4">
                <Button className="w-full mb-4">View Documentation</Button>
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-8">
          {!isFirst && (
            <Button
              variant="ghost"
              onClick={() => swiper?.slidePrev()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <IconChevronLeft size={16} />
              {prevSlideTitle && <span>{prevSlideTitle}</span>}
            </Button>
          )}

          {!isLast && (
            <Button
              variant="ghost"
              onClick={() => swiper?.slideNext()}
              className="flex items-center gap-2 text-muted-foreground ml-auto hover:text-foreground"
            >
              {nextSlideTitle && <span>{nextSlideTitle}</span>}
              <IconChevronRight size={16} />
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

  const slides = [
    {
      title: "Introducing",
      description:
        "We're excited to announce e-mode! Boosted weights and increased borrowing power for correlated assets.",
      features: ["Boosted collateral weights", "Incrased borrowing power", "Maximize your leverage"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/2",
      nextSlideTitle: "Boosted weights",
    },
    {
      title: "Increased borrow power",
      description: "e-mode will apply boosted weights for correlated pairs, meaning increased borrowing power.",
      features: ["Boost your collateral weights", "Borrow more against correlated pairs"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/1",
      prevSlideTitle: "Introducing e-mode",
      nextSlideTitle: "Maximize leverage",
    },
    {
      title: "Maximize your leverage",
      description:
        "Experience improved capital efficiency with grouped assets and boosted weights for maximum borrowing power.",
      features: ["Grouped assets with boosted weights", "Increased collateral efficiency", "More borrowing power"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/3",
      prevSlideTitle: "Strategy",
      nextSlideTitle: "Get Started",
    },
    {
      title: "Get started",
      description:
        "Join thousands of users already maximizing their capital efficiency with e-mode. Get started today and unlock your borrowing potential.",
      features: ["Easy setup process", "Immediate access to enhanced borrowing", "24/7 community support"],
      video: "https://storage.googleapis.com/mrgn-public/e-mode-videos/4",
      prevSlideTitle: "Benefits",
    },
  ];

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden bg-background">
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
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export { AnnouncementEmode };

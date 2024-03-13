import React from "react";

import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { Swiper, SwiperSlide, useSwiper } from "swiper/react";

import { cn, getTokenImageURL } from "~/utils";

import { IconArrowRight } from "~/components/ui/icons";

import "swiper/css";

export type AnnouncementCustomItem = {
  text: string;
  image: React.ReactNode | string;
  onClick?: () => void;
};

export type AnnouncementBankItem = {
  bank: ExtendedBankInfo;
  text?: string;
};

type AnnouncementsProps = {
  items: (AnnouncementBankItem | AnnouncementCustomItem)[];
};

type PaginationProps = {
  itemsLength: number;
};

const isBankItem = (item: AnnouncementBankItem | AnnouncementCustomItem): item is AnnouncementBankItem => {
  return (item as AnnouncementBankItem).bank?.meta !== undefined;
};

const Pagination = ({ itemsLength }: PaginationProps) => {
  const swiper = useSwiper();
  const [activeIndex, setActiveIndex] = React.useState(swiper.activeIndex);

  React.useEffect(() => {
    swiper.on("slideChange", () => {
      setActiveIndex(swiper.activeIndex);
    });
  }, [swiper]);
  return (
    <nav className="flex justify-center">
      <ul className="flex items-center gap-2">
        {[...new Array(itemsLength)].map((_, index) => (
          <li key={index}>
            <button
              className={cn(
                "w-1.5 h-1.5 bg-primary/30 rounded-full transition-all",
                index === activeIndex && "w-4 bg-primary/75"
              )}
              onClick={() => {
                swiper.slideTo(index);
              }}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

export const Announcements = ({ items }: AnnouncementsProps) => {
  return (
    <div className="px-4 w-full">
      <div className="max-w-[480px] mx-auto w-full">
        <Swiper spaceBetween={50} slidesPerView={1}>
          {items.map((item, index) => (
            <SwiperSlide key={index}>
              <div
                className="bg-background-gray-dark border border-background-gray rounded-lg w-full p-4 cursor-pointer transition hover:border-background-gray-hover"
                onClick={() => {
                  if (isBankItem(item)) {
                    console.log("Trigger Action box");
                  } else if (item.onClick) {
                    item.onClick();
                  }
                }}
              >
                {isBankItem(item) ? (
                  <div className="flex items-center gap-2 w-full">
                    <Image
                      src={getTokenImageURL(item.bank.meta.tokenSymbol)}
                      alt={`${item.bank.meta.tokenSymbol} logo`}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <p>
                      <strong className="font-medium mr-1.5">{item.bank.meta.tokenSymbol}</strong>
                      {item.text || "now available on marginfi"}
                    </p>
                    <IconArrowRight size={20} className="ml-auto text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 w-full font-normal">
                    {typeof item.image === "string" ? (
                      <Image src={item.image} alt={item.text} width={24} height={24} className="rounded-full" />
                    ) : (
                      item.image
                    )}
                    <h2>{item.text}</h2>
                    <IconArrowRight size={20} className="ml-auto text-muted-foreground" />
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
          {items.length > 1 && <Pagination itemsLength={items.length} />}
        </Swiper>
      </div>
    </div>
  );
};

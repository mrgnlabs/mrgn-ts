import React from "react";

import Image from "next/image";
import { Swiper, SwiperSlide, useSwiper } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { IconArrowRight } from "@tabler/icons-react";

import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture, LendingModes, cn } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";

import "swiper/css";
import "swiper/css/autoplay";

export type AnnouncementCustomItem = {
  text: string;
  image: React.ReactNode | string;
  onClick?: () => void;
  requireAuth?: boolean;
};

export type AnnouncementBankItem = {
  bank: ExtendedBankInfo;
  lendingMode?: LendingModes;
  actionType?: ActionType;
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
  const [fetchMrgnlendState] = useMrgnlendStore((state) => [state.fetchMrgnlendState]);
  const { connected } = useWallet();
  const [requestedAction, setRequestedAction] = React.useState<ActionType>();
  const [requestedBank, setRequestedBank] = React.useState<ExtendedBankInfo | null>(null);

  return (
    <div className="px-4 w-full">
      <div className="max-w-[480px] mx-auto w-full text-sm md:text-base">
        <Swiper
          spaceBetween={50}
          slidesPerView={1}
          autoplay={{
            delay: 5000,
            pauseOnMouseEnter: true,
          }}
          modules={[Autoplay]}
        >
          {items.map((item, index) => (
            <SwiperSlide key={index}>
              <div
                className={cn(
                  "bg-background-gray border border-background-gray rounded-lg w-full p-2.5 px-2 md:p-3 transition",
                  isBankItem(item) || (item.onClick && !item.requireAuth)
                    ? "hover:border-background-gray-hover cursor-pointer"
                    : "cursor-default"
                )}
                onClick={() => {
                  if (!isBankItem(item) && item.onClick && (!item.requireAuth || connected)) {
                    item.onClick();
                  }
                }}
              >
                {isBankItem(item) ? (
                  <ActionBox.Lend
                    isDialog={true}
                    useProvider={true}
                    lendProps={{
                      connected: connected,
                      requestedLendType: item.actionType || ActionType.Deposit,
                      requestedBank: requestedBank ?? undefined,
                      captureEvent: (event, properties) => {
                        capture(event, properties);
                      },
                      onComplete: () => {
                        fetchMrgnlendState();
                      },
                    }}
                    dialogProps={{
                      trigger: (
                        <div
                          className="flex items-center gap-2 w-full"
                          onClick={() => {
                            setRequestedAction(item.actionType || ActionType.Deposit);
                            setRequestedBank(item.bank);
                          }}
                        >
                          <Image
                            src={item.bank.meta.tokenLogoUri}
                            alt={`${item.bank.meta.tokenSymbol} logo`}
                            width={24}
                            height={24}
                            className="rounded-full size-6 object-cover"
                          />
                          <p className="text-xs md:text-sm">
                            <strong className="font-medium mr-1.5">{item.bank.meta.tokenSymbol}</strong>
                            {item.text || "now available on marginfi"}
                          </p>
                          <IconArrowRight size={20} className="ml-auto text-muted-foreground" />
                        </div>
                      ),
                      title: `Supply ${item.bank.meta.tokenSymbol}`,
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 w-full font-normal">
                    {typeof item.image === "string" ? (
                      <Image src={item.image} alt={item.text} width={24} height={24} className="rounded-full" />
                    ) : (
                      item.image
                    )}
                    <h2 className="text-center text-xs md:text-sm font-normal">{item.text}</h2>
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

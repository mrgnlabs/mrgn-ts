import { FC, ReactNode } from "react";
import { useUiStore } from "~/store";
import { WalletButton } from "./Wallet";
import { Mobile } from "~/mediaQueries";
import { IconMrgn } from "~/components/ui/icons";

interface PageHeaderProps {
  children: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  const [isFetchingData] = useUiStore((state) => [state.isFetchingData]);

  return (
    <div className="flex w-full h-[90px] sm:h-[60px] justify-center items-center border-y bg-[url('/WaveBG3.png')]">
      <div className="w-full px-4 sm:max-w-7xl flex flex-row justify-between items-center border-solid font-aeonik font-normal text-2xl sm:text-3xl">
        <div className="flex gap-4 justify-center items-center">
          <Mobile>
            <div className="ml-[4px]">
              <IconMrgn size={18} className={`${isFetchingData ? "animate-pulse" : ""}`} />
            </div>
          </Mobile>
          <div>{children}</div>
        </div>
        <Mobile>
          <div className="flex justify-center items-center gap-3">
            <WalletButton />
          </div>
        </Mobile>
      </div>
    </div>
  );
};

export { PageHeader };

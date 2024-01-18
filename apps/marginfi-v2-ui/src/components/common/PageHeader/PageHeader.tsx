import { FC, ReactNode } from "react";
import Head from "next/head";
import { useMrgnlendStore, useUiStore } from "~/store";
import { WalletButton } from "../Wallet";
import { Mobile } from "~/mediaQueries";
import { IconMrgn } from "~/components/ui/icons";

interface PageHeaderProps {
  children: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  const [isFetchingData] = useUiStore((state) => [state.isFetchingData]);

  return (
    <>
      <Head>
        <link rel="preload" as="image" href="/WaveBG3.png" type="image/png" />
      </Head>
      <div className="flex w-full h-[74px] sm:h-[60px] justify-center items-center border-y bg-[url('/WaveBG3.png')]">
        <div className="w-full xl:w-4/5 px-4 xl:max-w-7xl flex flex-row justify-between items-center border-solid font-aeonik font-normal text-2xl sm:text-3xl">
          <div className="flex gap-4 justify-center items-center">
            <Mobile>
              <div className="ml-[4px]">
                <IconMrgn size={18} className={`${isFetchingData ? "animate-pulse" : ""}`} />
              </div>
            </Mobile>
            <div>{children}</div>
          </div>
          <Mobile>
            {initialized && (
              <div className="flex justify-center items-center gap-3">
                <WalletButton />
              </div>
            )}
          </Mobile>
        </div>
      </div>
    </>
  );
};

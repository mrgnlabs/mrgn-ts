import { FC, ReactNode } from "react";
import { WalletOutlined } from "@mui/icons-material";
import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Mobile } from "~/mediaQueries";
import { Mrgn } from "./icons/Mrgn";

interface PageHeaderProps {
  children: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  const { connected } = useWalletContext();
  const [setIsWalletDrawerOpen, isFetchingData] = useUiStore((state) => [
    state.setIsWalletDrawerOpen,
    state.isFetchingData,
  ]);

  return (
    <div className="flex w-full h-[90px] sm:h-[60px] justify-center items-center border-solid border-[#1C2125] border-y-[1px] bg-[url('/WaveBG3.png')]">
      <div className="w-full px-4 sm:w-4/5 sm:max-w-7xl flex flex-row justify-between items-center border-solid font-aeonik font-normal text-2xl sm:text-3xl">
        <div className="flex gap-4 justify-center items-center">
          <Mobile>
            <Mrgn className={`w-[24px] ${isFetchingData ? "animate-pulse" : ""}`} />
          </Mobile>
          <div>{children}</div>
        </div>
        <Mobile>
          <div className="flex justify-center items-center gap-3">
            {!connected && (
              <div
                className="flex justify-center gap-1.5 items-center cursor-pointer bg-white rounded-md border-[1px] border-white transition hover:bg-transparent text-black text-base px-3 py-1"
                onClick={() => {
                  setIsWalletDrawerOpen(true);
                }}
              >
                <WalletOutlined className="text-lg" /> Connect
              </div>
            )}
          </div>
        </Mobile>
      </div>
    </div>
  );
};

export { PageHeader };

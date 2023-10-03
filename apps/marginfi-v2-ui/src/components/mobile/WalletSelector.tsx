import { Modal, Slide } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import { FC, useState } from "react";
import { useUiStore } from "~/store";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const WalletSelector: FC = () => {
  const { select, wallets } = useWallet();
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useUiStore((state) => [
    state.isWalletDrawerOpen,
    state.setIsWalletDrawerOpen,
  ]);

  const [moreCollapsed, setMoreCollapsed] = useState<boolean>(true);

  return (
    <Modal
      open={isWalletDrawerOpen}
      onClose={() => {
        setMoreCollapsed(true);
        setIsWalletDrawerOpen(false);
      }}
    >
      <Slide direction="up" in={isWalletDrawerOpen} mountOnEnter unmountOnExit>
        <div className="absolute bottom-0 left-0 w-full h-1/2 px-6 py-6 opacity-1 bg-lines2 bg-[#171C1F] rounded-t-3xl border-t-[1px] border-t-[#333] font-aeonik font-[400] text-lg">
          {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 ? (
            <>
              <div className="flex justify-center items-center font-[500] text-[#868E95]">Select a wallet</div>
              <div className="w-full h-full flex flex-col gap-4 mt-2 pr-3 overflow-y-auto">
                {wallets
                  .filter((wallet) => wallet.readyState === "Installed")
                  .map((wallet) => (
                    <div
                      key={wallet.adapter.name}
                      onClick={() => {
                        select(wallet.adapter.name);
                        setIsWalletDrawerOpen(false);
                        setMoreCollapsed(true);
                      }}
                      className="w-full flex justify-between"
                    >
                      <div className="flex gap-3 justify-center items-center">
                        <Image src={wallet.adapter.icon} alt={wallet.adapter.name} height={20} width={20} />
                        <div>{wallet.adapter.name}</div>
                      </div>
                      <div className="text-[#868E95] italic">Detected</div>
                    </div>
                  ))}
                {moreCollapsed ? (
                  <div className="w-full flex justify-center items-center gap-2">
                    more
                    <ExpandMoreIcon onClick={() => setMoreCollapsed(false)} />
                  </div>
                ) : (
                  <>
                    {wallets
                      .filter((wallet) => wallet.readyState !== "Installed")
                      .map((wallet) => (
                        <div
                          key={wallet.adapter.name}
                          onClick={() => {
                            setMoreCollapsed(true);
                            window.location.assign(wallet.adapter.url);
                          }}
                          className="w-full flex justify-between"
                        >
                          <div className="flex gap-3 justify-center items-center">
                            <Image src={wallet.adapter.icon} alt={wallet.adapter.name} height={20} width={20} />
                            <div>{wallet.adapter.name}</div>
                          </div>
                          <div className="text-[#868E95] italic">Not installed</div>
                        </div>
                      ))}
                    <div
                      className="w-full flex justify-center items-center gap-2"
                      onClick={() => setMoreCollapsed(true)}
                    >
                      less
                      <ExpandLessIcon />
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex justify-center items-center text-center">No wallet found. Please download a supported Solana wallet</div>
          )}
        </div>
      </Slide>
    </Modal>
  );
};

export { WalletSelector };

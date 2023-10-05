import { Modal, Slide } from "@mui/material";
import { Wallet, useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useUiStore } from "~/store";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { WalletName, WalletReadyState } from "@solana/wallet-adapter-base";
import { WalletConnectModal } from "@walletconnect/modal";

const modal = new WalletConnectModal({
  projectId: "69125c28c9733812e7b6653a2222cb0e",
  chains: ["solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"],
});

const WalletSelector: FC<{ featuredWallets?: number }> = ({ featuredWallets = 3 }) => {
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useUiStore((state) => [
    state.isWalletDrawerOpen,
    state.setIsWalletDrawerOpen,
  ]);

  const { wallets, select } = useWallet();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    select(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [featured, more] = useMemo(() => {
    const installed: Wallet[] = [];
    const loadable: Wallet[] = [];
    const notDetected: Wallet[] = [];

    for (const wallet of wallets) {
      if (wallet.readyState === WalletReadyState.NotDetected) {
        notDetected.push(wallet);
      } else if (wallet.readyState === WalletReadyState.Loadable) {
        loadable.push(wallet);
      } else if (wallet.readyState === WalletReadyState.Installed) {
        installed.push(wallet);
      }
    }

    const orderedWallets = [...installed, ...loadable, ...notDetected];
    return [orderedWallets.slice(0, featuredWallets), orderedWallets.slice(featuredWallets)];
  }, [wallets, featuredWallets]);

  const handleWalletClick = useCallback(
    (walletName: WalletName) => {
      select(walletName);
      setExpanded(false);
      setIsWalletDrawerOpen(false);
    },
    [select, setIsWalletDrawerOpen]
  );
  return (
    <Modal
      open={isWalletDrawerOpen}
      onClose={() => {
        setExpanded(false);
        setIsWalletDrawerOpen(false);
      }}
    >
      <Slide direction="up" in={isWalletDrawerOpen} mountOnEnter unmountOnExit>
        <div className="absolute bottom-0 left-0 w-full h-1/2 px-6 py-6 opacity-1 bg-lines2 bg-[#171C1F] rounded-t-3xl border-t-[1px] border-t-[#333] font-aeonik font-[400] text-lg">
          {featured.length > 0 ? (
            <>
              <div className="flex justify-center items-center font-[500] text-[#868E95]">Select a wallet</div>
              <div className="w-full h-full flex flex-col gap-4 mt-2 pr-3 overflow-y-auto">
                <div
                  key={"walletconnect"}
                  onClick={() => {
                    modal.openModal();
                    setIsWalletDrawerOpen(false);
                  }}
                  className="w-full flex justify-between"
                >
                  <div className="flex gap-3 justify-center items-center">
                    <div>walletconnect</div>
                  </div>
                </div>
                {featured.map((wallet) => (
                  <div
                    key={wallet.adapter.name}
                    onClick={() => handleWalletClick(wallet.adapter.name)}
                    className="w-full flex justify-between"
                  >
                    <div className="flex gap-3 justify-center items-center">
                      <Image src={wallet.adapter.icon} alt={wallet.adapter.name} height={20} width={20} />
                      <div>{wallet.adapter.name}</div>
                    </div>
                    <div className="text-[#868E95] italic">{wallet.readyState}</div>
                  </div>
                ))}
                {more.length === 0 ? null : expanded ? (
                  <>
                    {more.map((wallet) => (
                      <div
                        key={wallet.adapter.name}
                        onClick={() => handleWalletClick(wallet.adapter.name)}
                        className="w-full flex justify-between"
                      >
                        <div className="flex gap-3 justify-center items-center">
                          <Image src={wallet.adapter.icon} alt={wallet.adapter.name} height={20} width={20} />
                          <div>{wallet.adapter.name}</div>
                        </div>
                        <div className="text-[#868E95] italic">{wallet.readyState}</div>
                      </div>
                    ))}
                    <div className="w-full flex justify-center items-center gap-2" onClick={() => setExpanded(false)}>
                      less
                      <ExpandLessIcon />
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-center items-center gap-2">
                    more
                    <ExpandMoreIcon onClick={() => setExpanded(true)} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex justify-center items-center text-center">
              No wallet found. Please download a supported Solana wallet
            </div>
          )}
        </div>
      </Slide>
    </Modal>
  );
};

export { WalletSelector };

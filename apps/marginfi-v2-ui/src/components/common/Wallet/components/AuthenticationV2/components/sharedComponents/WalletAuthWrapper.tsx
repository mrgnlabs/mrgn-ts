import React from "react";
import Image from "next/image";
import { Wallet } from "@solana/wallet-adapter-react";

import { walletIcons } from "~/utils";

import { WalletAuthButton } from "./WalletAuthButton";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { IconPlus, IconUsersPlus } from "~/components/ui/icons";

interface props {
  isLoading: boolean;
  isActiveLoading: string;
  wallets: Wallet[];
  onClick: (wallet: Wallet) => void;
}

export const WalletAuthWrapper = ({ isLoading, isActiveLoading, wallets, onClick }: props) => {
  const isOverflow = React.useMemo(() => wallets.length > 5, [wallets]);

  const overflowedWallets = React.useMemo(() => (isOverflow ? wallets.slice(5) : []), [wallets, isOverflow]);
  const filteredWallets = React.useMemo(
    () => (isOverflow ? wallets.slice(undefined, 5) : wallets),
    [isOverflow, wallets]
  );

  return (
    <>
      {filteredWallets.map((wallet, i) => {
        const img = walletIcons[wallet.adapter.name] || (
          <Image src={wallet.adapter.icon} width={28} height={28} alt={wallet.adapter.name} />
        );
        return (
          <li key={i} className="space-y-2">
            <WalletAuthButton
              name={wallet.adapter.name}
              image={img}
              loading={isLoading && isActiveLoading === wallet.adapter.name}
              active={!isLoading || (isLoading && isActiveLoading === wallet.adapter.name)}
              onClick={() => onClick(wallet)}
            />
          </li>
        );
      })}
      {isOverflow && (
        <Popover>
          <PopoverTrigger>
            <div className="flex justify-center items-center w-14 h-14 rounded-full transition-colors bg-accent hover:bg-accent-highlight">
              <IconPlus />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-3xl">
            <ul className="flex flex-wrap items-start justify-center gap-4 overflow-auto">
              {overflowedWallets.map((wallet, i) => {
                const img = walletIcons[wallet.adapter.name] || (
                  <Image src={wallet.adapter.icon} width={28} height={28} alt={wallet.adapter.name} />
                );
                return (
                  <li key={i} className="space-y-2">
                    <WalletAuthButton
                      name={wallet.adapter.name}
                      image={img}
                      loading={isLoading && isActiveLoading === wallet.adapter.name}
                      active={!isLoading || (isLoading && isActiveLoading === wallet.adapter.name)}
                      onClick={() => onClick(wallet)}
                    />
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};

import { Button, ButtonProps } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC, ReactNode } from "react";
import dynamic from "next/dynamic";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface AssetRowActionProps extends ButtonProps {
  children: ReactNode;
}

const AssetRowAction: FC<AssetRowActionProps> = ({ children, disabled, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className="bg-white text-black normal-case text-sm mx-2 sm:mx-0 w-28 sm:min-w-32 w-[50%] h-full rounded-md"
      style={{
        backgroundColor: disabled || !wallet.connected ? "gray" : "rgb(227, 227, 227)",
        color: "black",
        fontFamily: "Aeonik Pro",
        zIndex: 10,
      }}
      {...otherProps}
      disabled={disabled || !wallet.connected}
    >
      {children}
    </Button>
  ) : (
    <WalletMultiButtonDynamic
      className={`bg-white text-black normal-case text-sm mx-2 sm:mx-0 w-28 sm:min-w-32 w-[100%] h-full rounded-md flex justify-center items-center`}
      startIcon={undefined}
    >
      Connect
    </WalletMultiButtonDynamic>
  );
};

export { AssetRowAction };

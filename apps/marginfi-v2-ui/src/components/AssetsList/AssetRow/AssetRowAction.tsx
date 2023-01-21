import { Button, ButtonProps } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC } from "react";
import dynamic from "next/dynamic";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface AssetRowActionProps extends ButtonProps {
  children: React.ReactNode;
}

const AssetRowAction: FC<AssetRowActionProps> = ({
  children,
  disabled,
  ...otherProps
}) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className="bg-white text-black normal-case text-sm mx-2 sm:mx-0 w-28 sm:w-32 h-10 max-w-1 rounded-[100px]"
      style={{
        // @todo why the fuck is tailwind broken
        backgroundColor:
          disabled || !wallet.connected ? "gray" : "rgb(227, 227, 227)",
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
      className="bg-white text-black normal-case text-sm mx-2 sm:mx-0 w-28 sm:w-32 h-10 max-w-1 rounded-[100px] flex justify-center items-center"
      startIcon={undefined}
    >
      Connect
    </WalletMultiButtonDynamic>
  );
};

export { AssetRowAction };

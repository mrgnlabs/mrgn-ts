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
  bgColor?: string;
}

const AssetRowAction: FC<AssetRowActionProps> = ({ children, disabled, bgColor, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className="normal-case text-[10px] sm:text-sm mx-2 sm:mx-0 w-14 sm:w-32 h-11 max-w-1 rounded-md"
      style={{
        backgroundColor:
          (disabled || !wallet.connected) ? 'gray'
          :
          bgColor ? bgColor : "rgb(227, 227, 227)",
        border: bgColor ? 'solid 1px rgb(227, 227, 227)' : 'none',
        color: bgColor === 'rgba(0,0,0,0)' ? "rgb(227, 227, 227)" : 'black',
        fontWeight: 400,
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
      className="bg-[#E3E3E3] text-black normal-case text-[10px] sm:text-sm mx-2 sm:mx-0 w-14 sm:w-32 h-11 max-w-1 rounded-md flex justify-center items-center"
      style={{ fontWeight: 400 }}
      startIcon={undefined}
    >
      Connect
    </WalletMultiButtonDynamic>
  );
};

export { AssetRowAction };

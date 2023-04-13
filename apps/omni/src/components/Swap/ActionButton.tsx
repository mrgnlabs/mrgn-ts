import { Button, ButtonProps } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC, ReactNode } from "react";
import dynamic from "next/dynamic";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface ActionButtonProps extends ButtonProps {
  children: ReactNode;
}

const ActionButton: FC<ActionButtonProps> = ({ children, disabled, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className="bg-[#DCE85D] text-black normal-case text-base w-full max-w-[310px] h-[60px] rounded flex justify-center items-center"
      style={{
        color: "black",
        fontFamily: "Aeonik Pro",
        fontWeight: 300,
        zIndex: 10,
      }}
      {...otherProps}
      disabled={disabled || !wallet.connected}
    >
      {children}
    </Button>
  ) : (
    <WalletMultiButtonDynamic
      className="bg-[#DCE85D] text-black normal-case text-base w-[310px] h-[60px] rounded flex justify-center items-center"
      style={{
        fontWeight: 300,
      }}
      startIcon={undefined}
    >
      Connect
    </WalletMultiButtonDynamic>
  );
};

export { ActionButton };

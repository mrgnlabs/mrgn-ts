import { Button, ButtonProps } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC } from "react";

interface AssetRowActionProps extends ButtonProps {
  children: React.ReactNode;
}

const AssetRowAction: FC<AssetRowActionProps> = ({
  children,
  ...otherProps
}) => {
  const wallet = useWallet();

  return (
    <Button
      className="bg-white text-black normal-case text-base mx-2 sm:mx-0 w-28 sm:w-32 h-12 max-w-1 rounded-[100px]"
      style={{
        // @todo why the fuck is tailwind broken
        backgroundColor:
          otherProps.disabled || !wallet.connected ? "gray" : "rgb(227, 227, 227)",
        color: "black",
        fontFamily: 'Aeonik Pro',
        fontWeight: 400,
      }}
      {...otherProps}
      disabled={otherProps.disabled || !wallet.connected}
    >
      {children}
    </Button>
  );
};

export { AssetRowAction };

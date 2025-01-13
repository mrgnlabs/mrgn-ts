import { ActionBox } from "@mrgnlabs/mrgn-ui";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

export default function SwapLendPage() {
  const { wallet, connected } = useWallet();

  return (
    <>
      <div className="flex flex-col max-w-7xl mx-auto w-full h-full justify-start items-center px-4 gap-4 mb-20">
        <ActionBox.SwapLend
          isDialog={false}
          useProvider={true}
          swapLendProps={{
            connected: connected,
            requestedDepositBank: undefined,
            requestedSwapBank: undefined,
            showAvailableCollateral: false,
            onComplete(previousTxn) {
              console.log("previousTxn", previousTxn); // TODO if we want to use this standalone on mrgnlend
            },
          }}
        />
      </div>
    </>
  );
}

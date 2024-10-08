import React from "react";

import { useUiStore } from "~/store";

import { Button } from "~/components/ui/button";

type props = {};

export const BuyWithMoonpay = ({}: props) => {
  const [setIsWalletOpen] = useUiStore((state) => [state.setIsWalletOpen]);

  return (
    <>
      <div className="text-sm text-[#C0BFBF] font-normal p-3">
        You don&apos;t own any supported tokens in marginfi. Check out what marginfi supports.
      </div>
      <Button variant="outline-dark" className="w-fit mx-auto mb-3" onClick={() => setIsWalletOpen(true)}>
        <>Buy with Moonpay</>
      </Button>
    </>
  );
};

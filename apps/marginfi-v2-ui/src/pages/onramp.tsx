import React from "react";
import { PageHeader } from "~/components/common/PageHeader";
import { Desktop } from "~/mediaQueries";
import { useWalletContext } from "~/hooks/useWalletContext";

const OnRampPage = () => {
  const { wallet } = useWalletContext();

  const moonPayParams = React.useMemo(() => {
    const params = {
      apiKey: "pk_test_MdEOdynudpW3MhMWlp7zcngbWlYvy",
      theme: "dark",
      currencyCode: "sol",
      defaultCurrencyCode: "sol",
      baseCurrencyCode: "usd",
      baseCurrencyAmount: "100",
      colorCode: "#7d01ff",
      walletAddress: wallet?.publicKey?.toString() || "",
    };

    return "?" + new URLSearchParams(params);
  }, [wallet]);

  return (
    <>
      <PageHeader>
        <div className="flex flex-row gap-1">
          <span>onramp</span>
          <Desktop>
            <div className="hidden sm:block flex flex-row items-center gap-1">
              <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">Powered</span>
              <span className="text-sm h-[48px] pt-[28px] bg-white bg-clip-text text-transparent">by</span>
              <span className="text-sm h-[48px] pt-[28px] text-[#935bcf] ml-1">Moonpay</span>
            </div>
          </Desktop>
        </div>
      </PageHeader>
      <div className="w-full h-full flex flex-col justify-start items-center content-start py-[32px] gap-8 w-4/5">
        <iframe
          height="740px"
          width="75%"
          src={`https://buy-sandbox.moonpay.com/${moonPayParams}`}
          style={{ border: "none", display: "flex", margin: "auto" }}
        />
      </div>
    </>
  );
};

export default OnRampPage;

import React, { FC, MouseEvent, useMemo, useState } from "react";
import Image from "next/image";
import { ProductSelector } from "~/components/Swap/ProductSelector";
import { HalfCircularGauge } from "~/components/Swap/Gauge";
import { ProductType } from "~/types";
import { ProductScreensLend } from "~/components/Swap/ProductScreens/ProductScreensLend";
import { useUserAccounts } from "~/context";
import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

const getProductScreen = (
  selectedProduct: ProductType,
  setProjectedDelta: (projectedHealthComponentDelta: { assets: number; liabilities: number }) => void
) => {
  switch (selectedProduct) {
    case ProductType.Lend:
      return <ProductScreensLend setProjectedDelta={setProjectedDelta} />;
    default:
      return null;
  }
};
const SwapUI: FC = () => {
  const { selectedAccount } = useUserAccounts();

  const [selectedProduct, setSelectedProduct] = useState<ProductType>(ProductType.Lend);
  const [projectedDelta, setProjectedDelta] = useState<{ assets: number; liabilities: number }>({
    assets: 0,
    liabilities: 0,
  });

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      let { assets, liabilities } = selectedAccount.getHealthComponents(MarginRequirementType.Maint);

      assets = assets.plus(projectedDelta.assets);
      liabilities = liabilities.plus(projectedDelta.liabilities);

      return assets.isZero() ? 1 : assets.minus(liabilities).dividedBy(assets).toNumber();
    } else {
      return 1;
    }
  }, [projectedDelta, selectedAccount]);

  // // Hack required to circumvent rehydration error
  // // @todo do we still need this in this UI? Let's find out!
  // const [hasMounted, setHasMounted] = useState(false);
  // useEffect(() => {
  //   setHasMounted(true);
  // }, []);
  // if (!hasMounted) {
  //
  //   return null;
  // }

  const handleProductChange = (event: MouseEvent<HTMLElement>, newSelectedProduct: ProductType) => {
    setSelectedProduct(newSelectedProduct);
  };

  return (
    <div className="p-4 mt-2 w-full relative">
      <ProductSelector selectedProduct={selectedProduct} handleProductChange={handleProductChange} />
      <div className="h-[320px] w-[400px] flex flex-col items-center justify-between mx-auto rounded-2xl px-10 py-8 bg-[#0E1113] border-2 border-[#1C2125] gap-2">
        <div className="absolute top-[140px]">
          <HalfCircularGauge percentage={healthFactor * 100} />
          <div className="w-[64px] h-[64px] flex justify-center items-center mx-auto rounded-full bg-[#0E1113] border-2 border-[#1C2125]">
            <Image src="/marginfi_logo.png" alt="marginfi logo" height={32} width={32} className="pb-1" />
          </div>
        </div>
        <div className="h-full gap-1">{getProductScreen(selectedProduct, setProjectedDelta)}</div>
      </div>
    </div>
  );
};

export default SwapUI;

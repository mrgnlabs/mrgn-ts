import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useMemo, useState, useEffect } from "react";
import { useUserAccounts } from "~/context";
import { collection, getDocs } from "firebase/firestore";
import { ExtendedBankInfo } from "~/types";
import { firebaseDb } from "~/api/firebase";
import { GlobalStats } from "./GlobalStats";
import { UserStats } from "./UserStats";

const AccountSummary: FC = () => {
  const { accountSummary, selectedAccount, extendedBankInfos } = useUserAccounts();
  const wallet = useWallet();
  const [globalPoints, setGlobalPoints] = useState<number | null>(null);

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.getHealthComponents(MarginRequirementType.Maint);
      return assets.isZero() ? 1 : assets.minus(liabilities).dividedBy(assets).toNumber();
    } else {
      return null;
    }
  }, [selectedAccount]);

  const calculateTotal = (bankInfos: ExtendedBankInfo[], field: string): number => {
    return bankInfos.reduce(
      (accumulator: number, bankInfo: any) => accumulator + bankInfo[field] * bankInfo.tokenPrice,
      0
    );
  };

  const globalDeposits = useMemo(() => calculateTotal(extendedBankInfos, "totalPoolDeposits"), [extendedBankInfos]);
  const globalBorrows = useMemo(() => calculateTotal(extendedBankInfos, "totalPoolBorrows"), [extendedBankInfos]);
  const globalTVL = useMemo(() => Math.max(globalDeposits - globalBorrows, 0), [globalDeposits, globalBorrows]);

  useEffect(() => {
    const calculateTotalPoints = async () => {
      const pointsCollection = collection(firebaseDb, "points");
      const pointSnapshot = await getDocs(pointsCollection);
      let totalPoints = 0;

      pointSnapshot.forEach((doc) => {
        totalPoints += doc.data().total_points ? parseFloat(doc.data().total_points) : 0;
      });

      setGlobalPoints(totalPoints);
    };

    calculateTotalPoints();
  }, []);

  return (
    <div className="flex flex-col 2xl:flex-row w-full h-full justify-between items-center">
      <div className="w-full 2xl:w-fit">
        <GlobalStats
          globalTVL={globalTVL}
          globalPoints={globalPoints}
          globalBorrows={globalBorrows}
          globalDeposits={globalDeposits}
        />
      </div>

      <div className="w-full 2xl:w-fit mt-[20px] 2xl:mt-0 ml-0 2xl:ml-[20px]">
        {wallet.connected && <UserStats accountSummary={accountSummary} healthFactor={healthFactor} />}
      </div>
    </div>
  );
};

export { AccountSummary };

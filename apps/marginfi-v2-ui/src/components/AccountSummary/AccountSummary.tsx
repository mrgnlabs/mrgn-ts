import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useMemo, useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { ExtendedBankInfo } from "~/types";
import { firebaseDb } from "~/api/firebase";
import { GlobalStats } from "./GlobalStats";
import { UserStats } from "./UserStats";
import { useStore } from "~/store";

const AccountSummary: FC = () => {
  const [accountSummary, selectedAccount, extendedBankInfos] = useStore((state) => [
    state.accountSummary,
    state.selectedAccount,
    state.extendedBankInfos,
  ]);
  const wallet = useWallet();
  const [globalPoints, setGlobalPoints] = useState<number | null>(null);

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.computeHealthComponents(MarginRequirementType.Maintenance);
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
    <div className="flex flex-col lg:flex-row w-full h-full justify-between items-center">
      <div className="hidden lg:block w-full">
        <GlobalStats
          globalTVL={globalTVL}
          globalPoints={globalPoints}
          globalBorrows={globalBorrows}
          globalDeposits={globalDeposits}
        />
      </div>

      <div className="w-full">
        {wallet.connected && <UserStats accountSummary={accountSummary} healthFactor={healthFactor} />}
      </div>
    </div>
  );
};

export { AccountSummary };

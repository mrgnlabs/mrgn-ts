import { WalletContextState } from "@solana/wallet-adapter-react";
import { createColumnHelper } from "@tanstack/react-table";

import { MarginfiAccountWrapper, EmodePair } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextStateOverride } from "@mrgnlabs/mrgn-ui";
import {
  AssetData,
  AssetPriceData,
  RateData,
  AssetWeightData,
  DepositsData,
  BankCapData,
  UtilizationData,
  PositionData,
  getAssetData,
  getAssetPriceData,
  getRateData,
  getAssetWeightData,
  getBankCapData,
  getUtilizationData,
  getDepositsData,
  getPositionData,
  PoolTypes,
} from "@mrgnlabs/mrgn-utils";

import {
  HeaderWrapper,
  getAssetCell,
  getAssetPriceCell,
  getAssetWeightCell,
  getBankCapCell,
  getDepositsCell,
  getRateCell,
  getUtilizationCell,
  getValidatorCell,
  getValidatorRateCell,
} from "../components";
import { getAction } from "./columnDataUtils";
import Link from "next/link";

export interface AssetListModel {
  asset: AssetData;
  validator: string;
  "validator-rate": string;
  price: AssetPriceData;
  rate: RateData;
  weight: AssetWeightData;
  deposits: DepositsData;
  bankCap: BankCapData;
  utilization: UtilizationData;
  position: PositionData;
  action: React.JSX.Element;
}
export const makeData = (
  data: ExtendedBankInfo[],
  isInLendingMode: boolean,
  nativeSolBalance: number,
  marginfiAccount: MarginfiAccountWrapper | null,
  connected: boolean,
  walletContextState: WalletContextStateOverride | WalletContextState,
  solPrice: number | null,
  fetchMrgnlendState: () => void,
  collateralBanksByLiabilityBank?: Record<
    string,
    {
      collateralBank: ExtendedBankInfo;
      emodePair: EmodePair;
    }[]
  >,
  liabilityBanksByCollateralBank?: Record<string, { liabilityBank: ExtendedBankInfo; emodePair: EmodePair }[]>
) => {
  return data.map((bank) => {
    const collateralBanks = collateralBanksByLiabilityBank?.[bank.address.toBase58()] || [];
    const liabilityBanks = liabilityBanksByCollateralBank?.[bank.address.toBase58()] || [];
    return {
      asset: getAssetData(bank, isInLendingMode, undefined, collateralBanks, liabilityBanks),
      validator: bank.meta.stakePool?.validatorVoteAccount || "",
      "validator-rate": bank.meta.stakePool?.validatorRewards || "",
      price: getAssetPriceData(bank),
      rate: getRateData(bank, isInLendingMode),
      weight: getAssetWeightData(bank, isInLendingMode, undefined, collateralBanks, liabilityBanks),
      deposits: getDepositsData(bank, isInLendingMode),
      bankCap: getBankCapData(bank, isInLendingMode),
      utilization: getUtilizationData(bank),
      position: getPositionData(bank, nativeSolBalance, isInLendingMode, solPrice),
      action: getAction(bank, isInLendingMode, marginfiAccount, connected, walletContextState, fetchMrgnlendState),
    } as AssetListModel;
  });
};

export const generateColumns = (isInLendingMode: boolean, poolType: PoolTypes) => {
  const columnHelper = createColumnHelper<AssetListModel>();

  const columns: ReturnType<typeof columnHelper.accessor>[] = [
    columnHelper.accessor("asset", {
      id: "asset",
      enableResizing: false,
      size: 210,
      cell: (props) => getAssetCell(props.getValue()),
      header: (header) => (
        <HeaderWrapper header={header} align="left">
          Asset
        </HeaderWrapper>
      ),
      enableSorting: false,
      footer: (props) => props.column.id,
    }),
  ];

  columns.push(
    columnHelper.accessor("price", {
      id: "price",
      enableResizing: false,
      size: 170,
      cell: (props) =>
        getAssetPriceCell({
          ...props.getValue(),
          isInLendingMode,
        }),
      header: (header) => (
        <HeaderWrapper
          header={header}
          infoTooltip={
            <div className="space-y-2">
              <p>Real-time prices powered by Pyth and Switchboard.</p>
              <p>
                {poolType === PoolTypes.NATIVE_STAKE &&
                  "Native stake LST price reflects the total stake and rewards in the pool."}
              </p>
            </div>
          }
        >
          Price
        </HeaderWrapper>
      ),
      sortingFn: (rowA, rowB, columnId) => {
        return rowA.original.price.assetPrice - rowB.original.price.assetPrice;
      },
      footer: (props) => props.column.id,
    })
  );

  if (poolType === PoolTypes.NATIVE_STAKE) {
    columns.push(
      columnHelper.accessor("validator", {
        id: "validator",
        enableResizing: false,
        size: 140,
        cell: (props) => getValidatorCell(props.getValue()),
        header: (header) => (
          <HeaderWrapper header={header} align="right" infoTooltip={<p>Validator vote account public key.</p>}>
            Validator
          </HeaderWrapper>
        ),
        enableSorting: false,
        footer: (props) => props.column.id,
      }),
      columnHelper.accessor("validator-rate", {
        id: "validator-rate",
        enableResizing: false,
        size: 170,
        cell: (props) => getValidatorRateCell(props.getValue()),
        header: (header) => (
          <HeaderWrapper header={header} align="right" infoTooltip={<p>Total validator rewards.</p>}>
            Total APY
          </HeaderWrapper>
        ),
        enableSorting: false,
        footer: (props) => props.column.id,
      })
    );
  } else {
    columns.push(
      columnHelper.accessor("rate", {
        id: "rate",
        enableResizing: true,
        maxSize: 120,
        cell: (props) => getRateCell(props.getValue()),
        header: (header) => (
          <HeaderWrapper
            header={header}
            infoTooltip={
              <p>
                {isInLendingMode
                  ? "What you'll earn on deposits over a year. This includes compounding."
                  : "What you'll pay for your borrows over a year. This includes compounding."}
              </p>
            }
          >
            APY
          </HeaderWrapper>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          return rowA.original.rate.rateAPY - rowB.original.rate.rateAPY;
        },
        footer: (props) => props.column.id,
      })
    );
  }

  if (poolType !== PoolTypes.ISOLATED) {
    columns.push(
      columnHelper.accessor("weight", {
        id: "weight",
        cell: (props) => getAssetWeightCell(props.getValue()),
        header: (header) => (
          <HeaderWrapper
            header={header}
            infoTooltip={
              <p>
                {isInLendingMode
                  ? "Percentage of an asset's value that counts toward your collateral. Higher weight means more borrowing power for that asset."
                  : "Loan-to-Value ratio (LTV) shows how much you can borrow relative to your available collateral. A higher LTV means you can borrow more, but it also increases liquidation risk."}
              </p>
            }
          >
            {isInLendingMode ? "Weight" : "LTV"}
          </HeaderWrapper>
        ),
        sortingFn: (rowA, rowB) => {
          return rowA.original.weight.assetWeight - rowB.original.weight.assetWeight;
        },
        footer: (props) => props.column.id,
      })
    );
  }

  columns.push(
    columnHelper.accessor("deposits", {
      id: "deposits",
      cell: (props) =>
        isInLendingMode ? getDepositsCell(props.getValue()) : getBankCapCell(props.row.original.bankCap),
      header: (header) => (
        <HeaderWrapper
          header={header}
          infoTooltip={<p>{isInLendingMode ? "Total deposits in the pool." : "Total borrows in the pool."}</p>}
        >
          {isInLendingMode ? "Deposits" : "Borrows"}
        </HeaderWrapper>
      ),
      sortingFn: (rowA, rowB) => {
        if (isInLendingMode) {
          const bankAInfo = rowA.original.bankCap.bank.info;
          const bankBInfo = rowB.original.bankCap.bank.info;
          const tvlA = bankAInfo.rawBank.computeTvl(bankAInfo.oraclePrice).toNumber();
          const tvlB = bankBInfo.rawBank.computeTvl(bankBInfo.oraclePrice).toNumber();
          return tvlA - tvlB;
        } else {
          return rowA.original.bankCap.bankCap - rowB.original.bankCap.bankCap;
        }
      },
      footer: (props) => props.column.id,
    }),
    columnHelper.accessor("bankCap", {
      id: "bankCap",
      cell: (props) =>
        isInLendingMode ? getBankCapCell(props.getValue()) : getDepositsCell(props.row.original.deposits),
      header: (header) => (
        <HeaderWrapper
          header={header}
          infoTooltip={
            <p>
              {isInLendingMode
                ? "Total amount that all users combined can deposit or borrow of a given token."
                : "Total available to borrow, based on the asset's borrow limit and available liquidity."}
            </p>
          }
        >
          {isInLendingMode ? "Global limit" : "Available"}
        </HeaderWrapper>
      ),
      sortingFn: (rowA, rowB) => {
        if (isInLendingMode) {
          return rowA.original.bankCap.bankCap - rowB.original.bankCap.bankCap;
        } else {
          const bankAInfo = rowA.original.bankCap.bank.info;
          const bankBInfo = rowB.original.bankCap.bank.info;
          const tvlA = bankAInfo.rawBank.computeTvl(bankAInfo.oraclePrice).toNumber();
          const tvlB = bankBInfo.rawBank.computeTvl(bankBInfo.oraclePrice).toNumber();
          return tvlA - tvlB;
        }
      },
      footer: (props) => props.column.id,
    })
  );

  if (poolType !== PoolTypes.NATIVE_STAKE) {
    columns.push(
      columnHelper.accessor("utilization", {
        id: "utilization",
        cell: (props) => getUtilizationCell(props.getValue()),
        header: (header) => (
          <HeaderWrapper
            header={header}
            infoTooltip={<p>The percentage of supplied tokens that have been borrowed.</p>}
          >
            Utilization
          </HeaderWrapper>
        ),
        sortingFn: (rowA, rowB) => {
          return rowA.original.utilization.utilization - rowB.original.utilization.utilization;
        },
        footer: (props) => props.column.id,
      })
    );
  }

  columns.push(
    columnHelper.accessor("action", {
      id: "action",
      header: () => <></>,
      cell: (props) => props.getValue(),
      footer: (props) => props.column.id,
    })
  );

  return columns;
};

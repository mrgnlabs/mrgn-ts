import { createColumnHelper } from "@tanstack/react-table";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import {
  AssetData,
  AssetPriceData,
  RateData,
  AssetWeightData,
  DepositsData,
  BankCapData,
  UtilizationData,
  PositionData,
  PoolTypes,
} from "@mrgnlabs/mrgn-utils";
import { RiskTier } from "@mrgnlabs/marginfi-client-v2";

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
  assetCategory: PoolTypes[];
  action: React.JSX.Element;
}

// Generate ALL possible columns once, use visibility to control what shows
export const generateColumns = (isInLendingMode: boolean) => {
  const columnHelper = createColumnHelper<AssetListModel>();

  // Always generate all columns - control visibility via React Table
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
              <p>{/* Native stake LST price reflects the total stake and rewards in the pool. */}</p>
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
    }),
    // Regular APY column (hidden for NATIVE_STAKE)
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
    }),
    // Validator column (only visible for NATIVE_STAKE)
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
    // Validator rate column (only visible for NATIVE_STAKE)
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
    }),
    // Weight column (hidden for ISOLATED)
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
    }),
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
    }),
    columnHelper.accessor("utilization", {
      id: "utilization",
      cell: (props) => getUtilizationCell(props.getValue()),
      header: (header) => (
        <HeaderWrapper header={header} infoTooltip={<p>The percentage of supplied tokens that have been borrowed.</p>}>
          Utilization
        </HeaderWrapper>
      ),
      sortingFn: (rowA, rowB) => {
        return rowA.original.utilization.utilization - rowB.original.utilization.utilization;
      },
      footer: (props) => props.column.id,
    }),
    columnHelper.accessor("action", {
      id: "action",
      header: () => <></>,
      cell: (props) => props.getValue(),
      footer: (props) => props.column.id,
    }),
  ];

  return columns;
};

// Helper function to determine which pool categories a bank belongs to
export const determineBankCategories = (bank: ExtendedBankInfo): PoolTypes[] => {
  const categories: PoolTypes[] = [];

  if (bank.info.rawBank.config.assetTag === 2) {
    categories.push(PoolTypes.NATIVE_STAKE);
  } else if (bank.info.rawBank.config.riskTier === RiskTier.Isolated) {
    categories.push(PoolTypes.ISOLATED);
  } else {
    categories.push(PoolTypes.GLOBAL);
  }

  // Check if bank has E-mode enabled
  if (bank.info.state.hasEmode) {
    categories.push(PoolTypes.E_MODE);
  }

  return categories;
};

// Helper function to get column visibility based on pool type
export const getColumnVisibility = (poolType: PoolTypes) => {
  const baseVisibility = {
    asset: true,
    price: true,
    deposits: true,
    bankCap: true,
    action: true,
  };

  switch (poolType) {
    case PoolTypes.NATIVE_STAKE:
      return {
        ...baseVisibility,
        rate: false, // Hide regular APY
        validator: true, // Show validator
        "validator-rate": true, // Show validator rate
        weight: true, // Show weight (native stake pools aren't isolated)
        utilization: false, // Hide utilization
      };
    case PoolTypes.ISOLATED:
      return {
        ...baseVisibility,
        rate: true, // Show regular APY
        validator: false, // Hide validator
        "validator-rate": false, // Hide validator rate
        weight: false, // Hide weight for isolated pools
        utilization: true, // Show utilization
      };
    default: // GLOBAL, EMODE
      return {
        ...baseVisibility,
        rate: true, // Show regular APY
        validator: false, // Hide validator
        "validator-rate": false, // Hide validator rate
        weight: true, // Show weight
        utilization: true, // Show utilization
      };
  }
};

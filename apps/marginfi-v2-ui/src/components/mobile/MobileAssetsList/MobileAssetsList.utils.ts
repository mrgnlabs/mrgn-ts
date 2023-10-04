import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

export type SortAssetOption = {
  label: string;
  borrowLabel?: string;
  value: SortType;
  field: "APY" | "TVL";
  direction: sortDirection;
};

type sortDirection = "ASC" | "DESC";

type SortType = "APY_ASC" | "APY_DESC" | "TVL_ASC" | "TVL_DESC";

export const SORT_OPTIONS_MAP: { [key in SortType]: SortAssetOption } = {
  APY_DESC: {
    label: "Apy ↓",
    borrowLabel: "Apr ↓",
    value: "APY_DESC",
    field: "APY",
    direction: "DESC",
  },
  APY_ASC: {
    label: "Apy ↑",
    borrowLabel: "Apr ↑",
    value: "APY_ASC",
    field: "APY",
    direction: "ASC",
  },
  TVL_DESC: {
    label: "Tvl ↓",
    value: "TVL_DESC",
    field: "TVL",
    direction: "DESC",
  },
  TVL_ASC: {
    label: "Tvl ↑",
    value: "TVL_ASC",
    field: "TVL",
    direction: "ASC",
  },
};

export const sortApRate = (banks: ExtendedBankInfo[], isInLendingMode: boolean, direction: sortDirection) => {
  return banks.sort((a, b) => {
    const apRateA =
      (isInLendingMode ? a.info.state.lendingRate : a.info.state.borrowingRate) +
      (isInLendingMode && a.info.state.emissions == Emissions.Lending ? a.info.state.emissionsRate : 0) +
      (!isInLendingMode && a.info.state.emissions == Emissions.Borrowing ? a.info.state.emissionsRate : 0);

    const apRateB =
      (isInLendingMode ? b.info.state.lendingRate : b.info.state.borrowingRate) +
      (isInLendingMode && b.info.state.emissions == Emissions.Lending ? b.info.state.emissionsRate : 0) +
      (!isInLendingMode && b.info.state.emissions == Emissions.Borrowing ? b.info.state.emissionsRate : 0);

    if (direction === "ASC") {
      return apRateA > apRateB ? 1 : -1;
    } else {
      return apRateA > apRateB ? -1 : 1;
    }
  });
};

export const sortTvl = (banks: ExtendedBankInfo[], direction: sortDirection) => {
  return banks.sort((a, b) => {
    const tvlA = a.info.state.totalDeposits - a.info.state.totalBorrows;

    const tvlB = b.info.state.totalDeposits - b.info.state.totalBorrows;

    if (direction === "ASC") {
      return tvlA > tvlB ? 1 : -1;
    } else {
      return tvlA > tvlB ? -1 : 1;
    }
  });
};

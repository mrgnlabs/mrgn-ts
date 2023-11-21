import { ExtendedBankInfo, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";
import { ArrowDownIcon } from "~/assets/icons/ArrowDownIcon";
import { ArrowUpIcon } from "~/assets/icons/ArrowUpIcon";

export type SortAssetOption = {
  label: string;
  borrowLabel?: string;
  Icon: React.FC<React.SVGAttributes<SVGElement>>;
  value: SortType;
  field: "APY" | "TVL";
  direction: sortDirection;
};

type sortDirection = "ASC" | "DESC";

export type SortType = "APY_ASC" | "APY_DESC" | "TVL_ASC" | "TVL_DESC";

export const SORT_OPTIONS_MAP: { [key in SortType]: SortAssetOption } = {
  APY_DESC: {
    label: "Apy",
    borrowLabel: "Apr",
    Icon: ArrowDownIcon,
    value: "APY_DESC",
    field: "APY",
    direction: "DESC",
  },
  APY_ASC: {
    label: "Apy",
    borrowLabel: "Apr",
    Icon: ArrowUpIcon,
    value: "APY_ASC",
    field: "APY",
    direction: "ASC",
  },
  TVL_DESC: {
    label: "Tvl",
    Icon: ArrowDownIcon,
    value: "TVL_DESC",
    field: "TVL",
    direction: "DESC",
  },
  TVL_ASC: {
    label: "Tvl",
    Icon: ArrowUpIcon,
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
    const tvlA = a.info.rawBank.computeTvl(a.info.oraclePrice).toNumber();
    const tvlB = b.info.rawBank.computeTvl(b.info.oraclePrice).toNumber();

    if (direction === "ASC") {
      return tvlA > tvlB ? 1 : -1;
    } else {
      return tvlA > tvlB ? -1 : 1;
    }
  });
};

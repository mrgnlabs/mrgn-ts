import {
  Balance,
  BankMap,
  MarginRequirementType,
  MarginfiAccountRaw,
  OraclePrice,
  MarginfiClient,
  MarginfiAccountWrapper,
} from "@mrgnlabs/marginfi-client-v2";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { MarginfiAccountMap, MarginfiWrapperAccountMap } from "./api";

export function calculateHealthComponents(
  banks: BankMap,
  oraclePrices: Map<string, OraclePrice>,
  accountRaw: MarginfiAccountRaw,
  marginReqType: MarginRequirementType,
  excludedBanks: PublicKey[] = []
): {
  assets: BigNumber;
  liabilities: BigNumber;
} {
  const activeBalances = accountRaw.lendingAccount.balances.map(Balance.from);

  const filteredBalances = activeBalances.filter(
    (accountBalance) => !excludedBanks.find((b) => b.equals(accountBalance.bankPk))
  );
  const [assets, liabilities] = filteredBalances
    .map((accountBalance) => {
      const bank = banks.get(accountBalance.bankPk.toBase58());
      if (!bank) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

      const priceInfo = oraclePrices.get(accountBalance.bankPk.toBase58());
      if (!priceInfo) throw Error(`Bank ${shortenAddress(accountBalance.bankPk)} not found`);

      const { assets, liabilities } = accountBalance.getUsdValueWithPriceBias(bank, priceInfo, marginReqType);
      return [assets, liabilities];
    })
    .reduce(
      ([asset, liability], [d, l]) => {
        return [asset.plus(d), liability.plus(l)];
      },
      [new BigNumber(0), new BigNumber(0)]
    );

  return { assets, liabilities };
}

export async function transformAccountMap(
  originalMap: MarginfiAccountMap,
  client: MarginfiClient
): Promise<MarginfiWrapperAccountMap> {
  const newMap: MarginfiWrapperAccountMap = {};

  for (const groupKey in originalMap) {
    newMap[groupKey] = originalMap[groupKey].map((accountObject) => ({
      key: accountObject.key,
      account: MarginfiAccountWrapper.fromAccountParsed(
        new PublicKey(accountObject.key),
        client,
        accountObject.account
      ),
    }));
  }

  return newMap;
}

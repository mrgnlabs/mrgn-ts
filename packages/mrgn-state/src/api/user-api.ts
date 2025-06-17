import {
  Bank,
  BankTypeDto,
  dtoToMarginfiAccount,
  MarginfiAccountType,
  MarginfiAccountTypeDto,
  OraclePrice,
  OraclePriceDto,
  oraclePriceToDto,
  toBankDto,
} from "@mrgnlabs/marginfi-client-v2";
import { BankMetadataMap } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import { getConfig } from "../config/app.config";

export const fetchMarginfiAccountAddresses = async (authority: PublicKey): Promise<PublicKey[]> => {
  const group = getConfig().mrgnConfig.groupPk;

  const response = await fetch(
    `/api/userData/marginfiAccountAddresses?authority=${authority.toBase58()}&group=${group.toBase58()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();

  return data.marginfiAccounts.map((a: string) => new PublicKey(a));
};

export const fetchMarginfiAccount = async (
  bankMap: Map<string, Bank>,
  oraclePrices: Map<string, OraclePrice>,
  bankMetadataMap: BankMetadataMap,
  marginfiAccountPk?: PublicKey
): Promise<MarginfiAccountType | null> => {
  if (!marginfiAccountPk) {
    return null;
  }

  const bankMapDto: Record<string, BankTypeDto> = {};
  for (const [bankAddress, bank] of bankMap.entries()) {
    bankMapDto[bankAddress] = toBankDto(bank);
  }

  const oraclePricesDto: Record<string, OraclePriceDto> = {};
  for (const [bankAddress, oraclePrice] of oraclePrices.entries()) {
    oraclePricesDto[bankAddress] = oraclePriceToDto(oraclePrice);
  }

  const response = await fetch("/api/userData/marginfiAccountData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bankMap: bankMapDto,
      oraclePrices: oraclePricesDto,
      marginfiAccountPk: marginfiAccountPk.toBase58(),
      bankMetadataMap: bankMetadataMap,
    }),
  });

  const data: { marginfiAccountDto: MarginfiAccountTypeDto } = await response.json();

  const marginfiAccount = dtoToMarginfiAccount(data.marginfiAccountDto);
  return marginfiAccount;
};

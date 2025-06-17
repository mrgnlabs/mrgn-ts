import {
  Bank,
  BankTypeDto,
  dtoToMarginfiAccount,
  MarginfiAccountType,
  MarginfiAccountTypeDto,
  OraclePrice,
  OraclePriceDto,
  oraclePriceToDto,
  PythPushFeedIdMap,
  toBankDto,
} from "@mrgnlabs/marginfi-client-v2";
import { BankMetadataMap } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import { getConfig } from "../config/app.config";
import { BankRawDatas } from "./bank-api";
import { RawMintData, TokenAccount, TokenAccountDto } from "../types";

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
  banks: BankRawDatas[],
  pythFeedIdMap: PythPushFeedIdMap,
  oraclePrices: Map<string, OraclePrice>,
  bankMetadataMap: BankMetadataMap,
  marginfiAccountPk?: PublicKey
): Promise<MarginfiAccountType | null> => {
  if (!marginfiAccountPk) {
    return null;
  }

  const bankMapDto: Record<string, BankTypeDto> = {};
  for (const rawBank of banks) {
    const bank = Bank.fromAccountParsed(
      rawBank.address,
      rawBank.data,
      pythFeedIdMap,
      bankMetadataMap[rawBank.address.toBase58()]
    );

    bankMapDto[bank.address.toBase58()] = toBankDto(bank);
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

export const fetchUserBalances = async (
  tokens: RawMintData[],
  userAddress?: PublicKey
): Promise<{ nativeSolBalance: number; ataList: TokenAccount[] }> => {
  if (!userAddress) {
    return {
      nativeSolBalance: 0,
      ataList: tokens.map((token) => ({
        mint: token.mint,
        created: false,
        balance: 0,
      })),
    };
  }
  const response = await fetch("/api/userData/balanceData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: userAddress.toBase58(),
      tokens: tokens.map((token) => ({
        tokenProgram: token.tokenProgram.toBase58(),
        mint: token.mint.toBase58(),
        decimal: token.decimals,
      })),
    }),
  });

  const data: { nativeSolBalance: number; ataList: TokenAccountDto[] } = await response.json();

  return {
    nativeSolBalance: data.nativeSolBalance,
    ataList: data.ataList.map((ata) => ({
      mint: new PublicKey(ata.mint),
      created: ata.created,
      balance: ata.balance,
    })),
  };
};

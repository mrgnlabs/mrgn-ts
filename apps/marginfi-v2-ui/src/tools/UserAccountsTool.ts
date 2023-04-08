import { Tool } from "langchain/tools";
import { Connection, PublicKey } from '@solana/web3.js';
import { getRoClient } from './utils';
import { makeBankInfo, computeAccountSummary, DEFAULT_ACCOUNT_SUMMARY, makeExtendedBankInfo } from "~/api";
import { Balance, Bank, MarginfiAccount, MarginRequirementType, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { loadTokenMetadatas } from "~/utils";
import { ActiveBankInfo, ExtendedBankInfo, isActiveBankInfo } from "~/types";

// import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
// import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
// import { useBanks } from "~/context";
import { TokenAccount, TokenAccountMap } from "~/types";
import { getAssociatedTokenAddressSync, nativeToUi, unpackAccount } from "@mrgnlabs/mrgn-common";
import MarginfiAccountReadonly from "@mrgnlabs/marginfi-client-v2/dist/accountReadonly";

interface FetchTokenAccountProps {
  banks: Bank[];
  walletPublicKey: string;
  connection: Connection;
}

const fetchTokenAccounts = async ({ banks, walletPublicKey, connection }: FetchTokenAccountProps): Promise<{
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
}> => {
  // Get relevant addresses
  const mintList = banks.map((bank) => ({
    address: bank.mint,
    decimals: bank.mintDecimals,
  }));

  if (walletPublicKey === null) {
    const emptyTokenAccountMap = new Map(
      mintList.map(({ address }) => [
        address.toBase58(),
        {
          created: false,
          mint: address,
          balance: 0,
        },
      ])
    );

    return {
      nativeSolBalance: 0,
      tokenAccountMap: emptyTokenAccountMap,
    };
  }

  const ataAddresses = mintList.map((mint) => getAssociatedTokenAddressSync(mint.address, new PublicKey(walletPublicKey)!));

  // Fetch relevant accounts
  const accountsAiList = await connection.getMultipleAccountsInfo([new PublicKey(walletPublicKey), ...ataAddresses]);

  // Decode account buffers
  const [walletAi, ...ataAiList] = accountsAiList;
  const nativeSolBalance = walletAi?.lamports ? walletAi.lamports / 1e9 : 0;

  const ataList: TokenAccount[] = ataAiList.map((ai, index) => {
    if (!ai) {
      return {
        created: false,
        mint: mintList[index].address,
        balance: 0,
      };
    }
    const decoded = unpackAccount(ataAddresses[index], ai);
    return {
      created: true,
      mint: decoded.mint,
      balance: nativeToUi(new BN(decoded.amount.toString()), mintList[index].decimals),
    };
  });

  return { nativeSolBalance, tokenAccountMap: new Map(ataList.map((ata) => [ata.mint.toString(), ata])) };
};


class UserAccountTool extends Tool {
  name = "user-account";

  description =
    "returns information about a user account. useful when you need information about a user's marginfi account. input should be a user's wallet public key."

  walletpublickey: string;
  
  constructor(
    walletPublicKey: string
  ) {
    super();

    if (!walletPublicKey) {
      // @todo ideally this will return a string vs. throw an error.
      // A string allows the agent to continue operating, while
      // an error will stop the agent.
      throw new Error("Please provide the user's wallet public key.")
    }

    this.walletpublickey = walletPublicKey;
  }

  async _call(input: string): Promise<string> {
    const client = await getRoClient();
    const userAccounts = await client.getMarginfiAccountsForAuthority(input);
    // @note: we assume the user has one account for now.
    const marginfiAccount = userAccounts[0];

    // account summary
    const equityComponents = marginfiAccount.getHealthComponents(MarginRequirementType.Equity);
    const balance = equityComponents.assets.minus(equityComponents.liabilities).toNumber();
    const lendingAmount = equityComponents.assets.toNumber()
    const borrowingAmount = equityComponents.liabilities.toNumber();

    // ExtendedBankInfo
    const tokenMetadataMap = loadTokenMetadatas();
    const banks = [...client.group.banks.values()];
    const { nativeSolBalance, tokenAccountMap } = await fetchTokenAccounts({
      banks,
      walletPublicKey: input,
      connection: new Connection(
        process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "https://mrgn.rpcpool.com/",
      )
    });
    
    const bankInfos = banks.map((bank) => {
      const tokenMetadata = tokenMetadataMap[bank.label];
      if (tokenMetadata === undefined) {
        throw new Error(`Token metadata not found for ${bank.label}`);
      }
      return makeBankInfo(bank, tokenMetadata);
    })
    const extendedBankInfos = bankInfos.map((bankInfo) => {
      const tokenAccount = tokenAccountMap.get(bankInfo.tokenMint.toBase58());
      if (tokenAccount === undefined) {
        throw new Error(`Token account not found for ${bankInfo.tokenMint}`);
      }
      return makeExtendedBankInfo(bankInfo, tokenAccount, nativeSolBalance, marginfiAccount);
    });

    return JSON.stringify({
      marginfiAccount,
      accountSummary: {
        balance,
        lendingAmount,
        borrowingAmount,
      },
      extendedBankInfos,
      activeBankInfos: extendedBankInfos.filter(isActiveBankInfo),
    })
  }
}

export { UserAccountTool };

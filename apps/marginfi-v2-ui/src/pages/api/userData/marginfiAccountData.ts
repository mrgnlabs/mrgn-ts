import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

import {
  Bank,
  BankTypeDto,
  dtoToBank,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
  OraclePrice,
  OraclePriceDto,
  dtoToOraclePrice,
  marginfiAccountToDto,
  fetchMarginfiAccountData,
} from "@mrgnlabs/marginfi-client-v2";
import { BankMetadataMap, Wallet } from "@mrgnlabs/mrgn-common";

import config from "~/config/marginfi";

interface MarginfiAccountDataRequest {
  bankMap: Record<string, BankTypeDto>;
  oraclePrices: Record<string, OraclePriceDto>;
  authorityPk: string;
  marginfiAccountPk: string;
  bankMetadataMap: BankMetadataMap;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as MarginfiAccountDataRequest;

    // Validate request body
    if (!body.marginfiAccountPk || !body.bankMap || !body.oraclePrices || !body.bankMetadataMap || !body.authorityPk) {
      return res.status(400).json({
        error: "Invalid request body. Expected marginfiAccountPk, bankMap, oraclePrices, and bankMetadataMap",
      });
    }

    // Validate marginfiAccountPk is a string
    if (typeof body.marginfiAccountPk !== "string") {
      return res.status(400).json({
        error: "Invalid marginfiAccountPk. Expected a string representing a base58-encoded public key",
      });
    }

    if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
      return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
    }

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);
    const marginfiAccountsPk = new PublicKey(body.marginfiAccountPk);

    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, { publicKey: new PublicKey(body.authorityPk) } as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const bankMap = new Map<string, Bank>();
    const oraclePrices = new Map<string, OraclePrice>();

    Object.entries(body.bankMap).forEach(([bankPk, bank]) => {
      bankMap.set(bankPk, Bank.fromBankType(dtoToBank(bank)));
    });

    Object.entries(body.oraclePrices).forEach(([bankPk, oraclePrice]) => {
      oraclePrices.set(bankPk, dtoToOraclePrice(oraclePrice));
    });

    const { marginfiAccount: marginfiAccountWithCache, error } = await fetchMarginfiAccountData(
      program,
      marginfiAccountsPk,
      bankMap,
      oraclePrices,
      body.bankMetadataMap
    );
    const marginfiAccountDto = marginfiAccountToDto(marginfiAccountWithCache);

    res.status(200).json({ marginfiAccountDto, error });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}

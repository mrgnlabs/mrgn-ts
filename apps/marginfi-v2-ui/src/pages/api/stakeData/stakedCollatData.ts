import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { chunkedGetRawMultipleAccountInfoOrdered, MintLayout, RawMint } from "@mrgnlabs/mrgn-common";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

const S_MAXAGE_TIME = 300;
const STALE_WHILE_REVALIDATE_TIME = 300;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawQuery = req.query.voteAccMintTuple;

  if (!rawQuery || typeof rawQuery !== "string") {
    return res.status(400).json({ error: "Invalid input: expected JSON string in voteAccMintTuple." });
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  try {
    const voteAccMintTuples: [string, string] = JSON.parse(rawQuery);

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

    const stakedCollatMap: Record<
      string,
      {
        validatorVoteAccount: PublicKey;
        mint: PublicKey;
        stakePoolAddress: PublicKey;
        poolAddress: PublicKey;
      }
    > = {};
    const solPools: string[] = [];
    const mints: string[] = [];

    const priceCoeffByVoteAcc: Record<string, number> = {};

    voteAccMintTuples.forEach(([validatorVoteAccount, mint]) => {
      const poolAddress = vendor.findPoolAddress(new PublicKey(validatorVoteAccount));
      const stakePoolAddress = vendor.findPoolStakeAddress(poolAddress);

      stakedCollatMap[validatorVoteAccount] = {
        validatorVoteAccount: new PublicKey(validatorVoteAccount),
        mint: new PublicKey(mint),
        stakePoolAddress,
        poolAddress,
      };
      solPools.push(stakePoolAddress.toBase58());
      mints.push(mint);
    });

    const dataAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, [...mints, ...solPools]);
    const stakePoolsAis: vendor.StakeAccount[] = dataAis
      .slice(mints.length)
      .map((ai) => vendor.getStakeAccount(ai.data));
    const lstMintsAis: RawMint[] = dataAis.slice(0, mints.length).map((mintAi) => MintLayout.decode(mintAi.data));

    const lstMintRecord: Record<string, RawMint> = Object.fromEntries(mints.map((mint, i) => [mint, lstMintsAis[i]]));
    const solPoolsRecord: Record<string, vendor.StakeAccount> = Object.fromEntries(
      solPools.map((poolKey, i) => [poolKey, stakePoolsAis[i]])
    );

    for (const index in stakedCollatMap) {
      const { mint, stakePoolAddress } = stakedCollatMap[index];
      const stakeAccount = solPoolsRecord[stakePoolAddress.toBase58()];
      const tokenSupply = lstMintRecord[mint.toBase58()].supply;

      const stakeActual = Number(stakeAccount.stake.delegation.stake);

      const computeAdjustmentFactor = (stakeActual: number, tokenSupply: bigint): number => {
        const supply = Number(tokenSupply);
        if (supply === 0) {
          return 1;
        }
        return (stakeActual - LAMPORTS_PER_SOL) / supply;
      };

      priceCoeffByVoteAcc[index] = computeAdjustmentFactor(stakeActual, tokenSupply);
    }

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(priceCoeffByVoteAcc);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

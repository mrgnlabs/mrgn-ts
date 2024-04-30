import { NextResponse } from "next/server";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import NodeCache from "node-cache";
import { Connection } from "@solana/web3.js";
import { getConfig, MARGINFI_IDL, MarginfiAccountRaw, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import { MarginfiAccountObject, MarginfiAccountObjectMap, fetchMarginfiAccounts } from "~/lib/marginfiAcc";

export const dynamic = "force-dynamic";

const marginfiCache = new NodeCache({ stdTTL: 1200 }); // 20 minutes

export async function GET(request: Request) {
  const data = await request.json();
  const walletKeys = data.walletkeys;
  const rpc = process.env.MARGINFI_RPC_ENDPOINT;

  if (!rpc) {
    console.error("Missing rpc url");
    return NextResponse.json(
      { error: "Missing rpc url" },
      {
        status: 401,
      }
    );
  }

  if (!walletKeys) {
    console.error("Missing wallet address parameter");
    return NextResponse.json(
      { error: "Missing wallet address parameter" },
      {
        status: 400,
      }
    );
  }

  const config = getConfig("production");
  const connection = new Connection("https://mrgn.rpcpool.com/c293bade994b3864b52c6bbbba4b", "confirmed");
  const provider = new AnchorProvider(connection, {} as any, {
    ...AnchorProvider.defaultOptions(),
    commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
  });
  const program = new Program(MARGINFI_IDL, config.programId, provider) as any as MarginfiProgram;

  // Fetch data for each wallet key
  const fetchAcc = async () => {
    const fetchedAccMap: MarginfiAccountObjectMap = {};

    await Promise.all(
      walletKeys.map(async (key: string) => {
        const cacheKey = `key_${key}`;
        const cachedData = marginfiCache.get(cacheKey) as MarginfiAccountObject[] | undefined;
        let fetchedData: MarginfiAccountObject[] = [];
        if (cachedData) {
          fetchedData = cachedData;
        } else {
          fetchedData = await fetchMarginfiAccounts(program, config, key);
        }
        fetchedAccMap[key] = fetchedData;
      })
    );

    return fetchedAccMap;
  };

  const fetchedDataMap = await fetchAcc();

  return NextResponse.json(fetchedDataMap, {
    status: 200,
  });
}

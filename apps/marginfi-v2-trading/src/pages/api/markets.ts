import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

const myCache = new NodeCache({ stdTTL: 240 });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dex, poolId } = req.query;
  const dexes = Array.isArray(dex) ? dex : [dex];
  const poolIds = Array.isArray(poolId) ? poolId : [poolId];
  const poolInfos: any = [];

  for (const [index, value] of dexes.entries()) {
    if (!value || !poolIds[index]) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }

    if (!["raydium", "meteora", "orca"].includes(value!)) {
      res.status(400).json({ error: "Invalid dex" });
      return;
    }

    const poolId = poolIds[index!] || "";

    if (value === "meteora") {
      // const meteoraPoolData = await fetchMeteoraPoolInfo(poolId);
      // if (meteoraPoolData) {
      //   poolInfos.push({
      //     dex: "meteora",
      //     data: meteoraPoolData,
      //   });
      // }

      poolInfos.push({
        dex: "meteora",
        data: {
          tvl: 1610181.07,
          vol: 2260975.64,
        },
      });
    } else if (value === "raydium") {
      const raydiumPoolData = await fetchRaydiumPoolInfo(poolId);
      if (raydiumPoolData) {
        poolInfos.push({
          dex: "raydium",
          data: raydiumPoolData,
        });
      }
    } else if (value === "orca") {
      const orcaPoolData = await fetchOrcaPoolInfo(poolId);
      if (orcaPoolData) {
        poolInfos.push({
          dex: "orca",
          data: orcaPoolData,
        });
      }
    }
  }

  res.status(200).json({ ...poolInfos });
}

async function fetchMeteoraPoolInfo(poolId: string) {
  const cacheKey = `markets_meteora_${poolId}`;

  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    console.log("_USING METEORA CACHE");
    return cachedData;
  }

  console.log("_FETCHING METEORA DATA");
  const res = await fetch(`https://amm.mercurial.finance/pools?address=${poolId}`);

  if (res.ok) {
    const data = await res.json();
    const pool = data[0];
    const poolData = {
      tvl: parseFloat(pool.pool_tvl),
      vol: parseFloat(pool.trading_volume),
    };

    myCache.set(cacheKey, poolData);
    return poolData;
  } else {
    return {
      tvl: 0,
      apy: 0,
    };
  }
}

async function fetchRaydiumPoolInfo(poolId: string) {
  const cacheKey = `markets_raydium_${poolId}`;

  console.log(poolId);

  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    console.log("_USING RAYDIUM CACHE");
    return cachedData;
  }

  console.log("_FETCHING RAYDIUM DATA");
  try {
    const res = await fetch(`https://uapi.raydium.io/v2/ammV3/ammPools`);

    if (res.ok) {
      const data = await res.json();
      const pool = data.find((p: any) => p.id === poolId);
      const poolData = {
        tvl: pool.tvl,
        vol: pool.day.volume,
      };

      myCache.set(cacheKey, poolData);
      return poolData;
    } else {
      return {
        tvl: 0,
        apy: 0,
      };
    }
  } catch (e) {
    console.log(e);
  }
}

async function fetchOrcaPoolInfo(poolId: string) {
  const cacheKey = `markets_orca_${poolId}`;

  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    console.log("_USING ORCA CACHE");
    return cachedData;
  }

  console.log("_FETCHING ORCA DATA");
  try {
    const res = await fetch(`https://api.mainnet.orca.so/v1/whirlpool/list`);

    console.log(res.status);

    if (res.ok) {
      const data = await res.json();
      const pool = data.whirlpools.find((p: any) => p.address === poolId);
      const poolData = {
        tvl: pool.tvl,
        vol: pool.volume.day,
      };

      myCache.set(cacheKey, poolData);
      return poolData;
    } else {
      return {
        tvl: 0,
        apy: 0,
      };
    }
  } catch (e) {
    console.log(e);
  }
}

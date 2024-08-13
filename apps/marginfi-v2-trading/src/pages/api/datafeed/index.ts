import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

import { RESOLUTION_MAPPING, configurationData, parseResolution } from "~/utils/tradingViewUtils";

const resolveCache = new NodeCache({ stdTTL: 300 }); // Cache for 5 min

const lastBarsCache = new Map();

// Make requests to Birdeye API
async function makeApiRequest(path: string) {
  try {
    const response = await fetch(`https://public-api.birdeye.so/${path}`, {
      headers: {
        "X-API-KEY": process.env.BIRDEYE_API_KEY || "",
      },
    });
    return response.json();
  } catch (error: any) {
    throw new Error(`Birdeye request error: ${error.status}`);
  }
}

interface HistoryParams {
  from: number;
  to: number;
  symbol: string;
  resolution: string;
  address: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  switch (action) {
    case "config":
      return res.status(200).json({
        ...configurationData,
      });

    case "search":
      const { query } = req.query;
      // Implement search logic here
      return res.status(200).json([]);

    case "resolve":
      const { symbol, address, requested } = req.query;
      try {
        if (address !== requested) {
          throw new Error("Cannot resolve symbol");
        }
        // if (symbols) {
        //   const response = await makeApiRequest(`defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=-1`);
        //   symbols = response.data.tokens;
        // }

        // const symbolItem = symbols.find((item: any) => item.address === symbol);

        // if (!symbolItem) {
        //   throw new Error("Cannot resolve symbol");
        // }

        // Implement resolve logic here
        return res.status(200).json({
          address: address,
          ticker: address,
          name: symbol,
          description: symbol + "/USD",
          type: undefined,
          session: "24x7",
          timezone: "Etc/UTC",
          minmov: 1,
          pricescale: 10 ** 16,
          has_intraday: true,
          has_no_volume: true,
          has_weekly_and_monthly: false,
          supported_resolutions: configurationData.supported_resolutions,
          intraday_multipliers: configurationData.intraday_multipliers,
          volume_precision: 2,
          data_status: "streaming",
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error fetching data" });
      }

    case "history":
      const {
        from,
        to,
        symbol: historySymbol,
        resolution,
        address: historyAddress,
        firstDataRequest,
      } = req.query as any;

      const urlParameters = {
        address: historyAddress,
        type: parseResolution(resolution),
        time_from: from,
        time_to: to,
      };

      const birdeyeQuery = Object.keys(urlParameters)
        .map((name) => `${name}=${encodeURIComponent((urlParameters as any)[name])}`)
        .join("&");

      try {
        const data = await makeApiRequest(`defi/ohlcv?${birdeyeQuery}`);

        if (!data.success || data.data.items.length === 0) {
          // "noData" should be set if there is no data in the requested period.
          return res.status(200).json({ noData: true, success: true });
        }
        let bars: any[] = [];
        data.data.items.forEach((bar: any) => {
          if (bar.unixTime >= from && bar.unixTime < to) {
            bars = [
              ...bars,
              {
                time: bar.unixTime * 1000,
                low: bar.l,
                high: bar.h,
                open: bar.o,
                close: bar.c,
              },
            ];
          }
        });

        if (firstDataRequest) {
          lastBarsCache.set(historyAddress, {
            ...bars[bars.length - 1],
          });
        }

        return res.status(200).json({ bars, success: true });
      } catch (error) {
        return res.status(200).json({ success: false });
      }
    case "fetchData":

    case "cache":
      const lastBarsCacheArray = Array.from(lastBarsCache.entries());

      return res.status(200).json({ lastBarsCacheArray });
    default:
      return res.status(404).json({ error: "Invalid action" });
  }
}

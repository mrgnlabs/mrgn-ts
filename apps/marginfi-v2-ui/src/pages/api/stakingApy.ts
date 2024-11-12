import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";
import { Readable } from "stream";
import { parse } from "csv-parse";

type PriceRecord = {
  timestamp: number;
  epoch: number;
  price: number;
};

const parsePriceRecordsFromCSV = async (csv: Readable): Promise<PriceRecord[]> => {
  const csvParser = parse({ delimiter: ",", columns: true });
  const records: PriceRecord[] = [];
  for await (const row of csv.pipe(csvParser)) {
    const { timestamp, epoch, price } = row;
    if (!timestamp || !epoch || !price) {
      throw new Error('Columns "timestamp", "epoch", "price" must be present!');
    }
    const record = {
      timestamp: Math.round(new Date(timestamp).getTime() / 1e3),
      epoch: Number(epoch),
      price: Number(price),
    };
    if (isNaN(record.timestamp)) {
      throw new Error("Timestamp must be a... timestamp!");
    }
    if (isNaN(record.epoch)) {
      throw new Error("Epoch must be a number!");
    }
    if (isNaN(record.price)) {
      throw new Error("Price must be a number!");
    }

    records.push(record);
  }
  return records;
};

const fetchAndParsePricesCsv = async (url: string) => {
  const csvResponse = await fetch(url);
  const csvContents = await csvResponse.text();
  const prices = await parsePriceRecordsFromCSV(Readable.from([csvContents]));

  return prices;
};

const myCache = new NodeCache({ stdTTL: 1800 }); // Cache for 1 hour
const SOLANA_COMPASS_BASE_URL = "https://raw.githubusercontent.com/glitchful-dev/sol-stake-pool-apy/master/db/";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { solanaCompassKey } = req.query;

  if (!solanaCompassKey) {
    return res.status(400).json({ error: "solanaCompassKey is required" });
  }

  const cacheKey = `key_${solanaCompassKey.toString()}`;

  const cachedData = myCache.get(cacheKey);

  if (cachedData) {
    res.status(200).json(cachedData);
    return;
  }

  try {
    const solanaCompassPrices = await fetchAndParsePricesCsv(`${SOLANA_COMPASS_BASE_URL}${solanaCompassKey}.csv`);
    myCache.set(cacheKey, solanaCompassPrices);
    res.status(200).json(solanaCompassPrices);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}

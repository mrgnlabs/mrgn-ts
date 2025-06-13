import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";

import { ADDRESS_LOOKUP_TABLE_FOR_GROUP } from "@mrgnlabs/marginfi-client-v2";

import config from "~/config/marginfi";
import { lutAccountToDto } from "@mrgnlabs/mrgn-state";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const group = config.mfiConfig.groupPk;

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  try {
    let addressLookupTableAddresses = ADDRESS_LOOKUP_TABLE_FOR_GROUP[group.toString()];

    if (!addressLookupTableAddresses) {
      try {
        const response = await fetch(`https://storage.googleapis.com/mrgn-public/mrgn-lut-cache.json`, {
          headers: {
            Accept: "application/json",
          },
          method: "GET",
        });

        if (response.status === 200) {
          const parsedResponse = await response.json();
          if (!parsedResponse) throw new Error("JSON is mia");
          const lookupTableString = parsedResponse[group.toString()];
          if (!lookupTableString) throw new Error("Group not found");
          addressLookupTableAddresses = [new PublicKey(lookupTableString)];
        } else {
          throw new Error("LUT not found");
        }
      } catch (error) {
        addressLookupTableAddresses = [];
      }
    }
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

    const addressLookupTables = (
      await Promise.all(addressLookupTableAddresses.map((address) => connection.getAddressLookupTable(address)))
    )
      .map((response) => (response?.value ? lutAccountToDto(response.value) : null))
      .filter((table) => table !== null);

    // daily refreshes
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=300");

    res.status(200).json(addressLookupTables);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}

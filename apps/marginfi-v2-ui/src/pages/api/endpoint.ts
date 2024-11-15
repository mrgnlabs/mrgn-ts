import type { NextApiRequest, NextApiResponse } from "next";
import { generateEndpoint } from "@mrgnlabs/mrgn-utils";

type EndpointResponse = {
  url: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<EndpointResponse>) {
  const endpoint = req.query.url as string;

  const url = await generateEndpoint(endpoint, process.env.RPC_PROXY_SALT ?? "");

  res.setHeader("Cache-Control", "public, max-age=14400");
  return res.status(200).json({
    url,
  });
}

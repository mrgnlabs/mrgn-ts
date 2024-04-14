import type { NextApiRequest, NextApiResponse } from "next";

// Set CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

// Define the URL for the remote API
const API_URL = "https://side-floral-frost.solana-mainnet.quiknode.pro/b298cbf2032aec7bb2fc88ef38ccfb6a4e46774b";
const API_AUTH_KEY = "b298cbf2032aec7bb2fc88ef38ccfb6a4e46774b";

// List of allowed domains for CORS
const ALLOWED_DOMAINS = [
  "app.solanadino.com",
  "devapp.solanadino.com",
  "https://xnfts.s3.us-west-2.amazonaws.com",
  "xnfts.s3.us-west-2.amazonaws.com",
  "https://swr.xnftdata.com/",
  "swr.xnftdata.com",
  "dex.solanadino.com",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, headers } = req;

  if (method === "OPTIONS") {
    // Handle CORS preflight requests
    res.setHeader("Access-Control-Allow-Origin", headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", corsHeaders["Access-Control-Allow-Methods"]);
    res.setHeader("Access-Control-Allow-Headers", corsHeaders["Access-Control-Allow-Headers"]);
    res.setHeader("Access-Control-Max-Age", corsHeaders["Access-Control-Max-Age"]);
    res.status(204).end();
    return;
  }

  // Check if the domain is allowed

  if (!req) {
    res.status(404).send("Not Found");
    return;
  }

  try {
    const apiURL = API_URL + req.url?.replace("/api/rpc", "");
    const dataRequest = new Request(apiURL, {
      method: req.method,
      headers: {
        Authorization: API_AUTH_KEY,
        Origin: new URL(apiURL).origin,
        "Content-Type": headers["content-type"] || "application/json",
      },
      body: req.method !== "GET" ? await req.body : undefined,
    });

    const apiResponse = await fetch(dataRequest);
    const data = await apiResponse.text();

    res.status(apiResponse.status).setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send(error);
  }
}

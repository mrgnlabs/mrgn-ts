import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("CACHE MISS");

  res.setHeader("Cache-Control", "s-maxage=59, stale-while-revalidate=59");
  res.status(200).json({ ok: "ok" });
}

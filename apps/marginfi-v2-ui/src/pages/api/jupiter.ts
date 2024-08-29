import { NextApiRequest, NextApiResponse } from "next";

const STORAGE_URL = "https://storage.googleapis.com/mrgn-public/blacklisted_routes.json";

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  // Fetch from API and update cache
  try {
    const response = await fetch(`${STORAGE_URL}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    res.setHeader("Cache-Control", "s-maxage=1000, stale-while-revalidate=59");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}

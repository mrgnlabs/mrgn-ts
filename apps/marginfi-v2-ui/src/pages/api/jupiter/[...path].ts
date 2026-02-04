import { NextApiRequest, NextApiResponse } from "next";

/**
 * Proxy handler for Jupiter API requests
 * This proxies requests to api.jup.ag and attaches the API key server-side
 * to prevent exposing the API key in the client
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check for API key in environment
  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) {
    console.error("JUPITER_API_KEY is not set in environment variables");
    return res.status(500).json({
      success: false,
      error: "Configuration Error",
      message: "Jupiter API key is not configured",
    });
  }

  try {
    // Get the path segments from the catch-all route
    const pathSegments = req.query.path as string[];
    const path = pathSegments.join("/");

    // Build query string from request query params (excluding the path param)
    const queryParams = { ...req.query };
    delete queryParams.path;
    const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();

    // Build the Jupiter API URL
    const jupiterUrl = `https://api.jup.ag/${path}${queryString ? `?${queryString}` : ""}`;

    // Prepare headers
    const headers: HeadersInit = {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    };

    // Prepare the fetch options
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // If it's a POST request, include the body
    if (req.method === "POST") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Make the request to Jupiter API
    const response = await fetch(jupiterUrl, fetchOptions);

    // Get the response data
    const data = await response.json();

    // Return the response with the same status code
    res.status(response.status).json(data);
  } catch (error: unknown) {
    console.error("Error proxying request to Jupiter API:", error);

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Error processing Jupiter API request",
    });
  }
}

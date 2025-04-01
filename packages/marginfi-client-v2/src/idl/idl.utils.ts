// Import fallback files
import * as MARGINFI_IDL_V0_1_0 from "./marginfi_0.1.0.json";
import { MarginfiIdlType } from ".";

// GCP storage URLs
const LATEST_IDL_URL = `https://storage.googleapis.com/mrgn-public/idl/marginfi_latest.json?t=${Date.now()}`;

/**
 * Fetches the latest IDL files from GCP.
 * If either fetch fails, it falls back to version 0.1.0.
 *
 * @returns The Marginfi IDL
 */
export async function fetchLatestIdl(): Promise<MarginfiIdlType> {
  try {
    const response = await fetch(LATEST_IDL_URL);
    if (!response.ok) {
      throw new Error("Failed to fetch latest IDL file from GCP");
    }

    // Get the response JSON
    const idlJson = await response.json();

    // Return the fetched data
    return idlJson as MarginfiIdlType;
  } catch (error) {
    console.error("Error fetching latest IDL file from GCP:", error);
    console.log("Falling back to version 0.1.0");

    // Return the fallback version
    return MARGINFI_IDL_V0_1_0 as MarginfiIdlType;
  }
}

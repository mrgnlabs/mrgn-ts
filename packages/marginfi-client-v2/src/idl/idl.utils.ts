// Import fallback files
import { MarginfiIdlType, MARGINFI_IDL } from ".";

// GCP storage URLs
const LATEST_IDL_URL = `https://storage.googleapis.com/mrgn-public/idl/marginfi_latest.json?t=${Date.now()}`;

/**
 * Fetches the latest IDL files from GCP.
 * If either fetch fails, it falls back to version 0.1.0.
 *
 * @returns The Marginfi IDL
 */
export function fetchLatestIdl(): MarginfiIdlType {
  // const response = await fetch(LATEST_IDL_URL);
  // if (!response.ok) {
  //   throw new Error("Failed to fetch latest IDL file from GCP");
  // }

  // // Get the response JSON
  // const idlJson = await response.json();

  // Return the fetched data
  return MARGINFI_IDL as MarginfiIdlType;
}

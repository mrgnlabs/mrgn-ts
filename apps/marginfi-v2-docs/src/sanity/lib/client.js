// Add debug output with console.log to inspect the fetch results
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

// Create the client first
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  stega: { studioUrl: "http://localhost:3007/studio" },
});

// Then add the debug wrapper
const originalFetch = client.fetch;
client.fetch = async function(query, params, options) {
  console.log('Sanity query:', query);
  const result = await originalFetch.call(this, query, params, options);
  console.log('Sanity result:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
  return result;
};

export default client; 
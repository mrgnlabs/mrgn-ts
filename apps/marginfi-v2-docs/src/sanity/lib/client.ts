// src/sanity/lib/client.ts

import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  stega: { studioUrl: "http://localhost:3007/studio" },
});

// Debug wrapper for the client fetch
const originalFetch = client.fetch.bind(client);
client.fetch = async function debugFetch(query: string, params?: any, options?: any) {
  console.log('Sanity query:', query);
  
  const result = await originalFetch(query, params, options);
  
  // Log general results
  console.log('Sanity result sample:', result ? 
    (Array.isArray(result) ? 
      `Array with ${result.length} items` : 
      JSON.stringify(result, null, 2).substring(0, 500) + '...'
    ) : 'null');
  
  // Special logging for ts-sdk page
  if (params?.slug === 'ts-sdk') {
    console.log(`[Sanity ts-sdk Result]`, JSON.stringify({
      title: result?.title,
      description: result?.description,
      // Log details about the content
      contentLength: result?.content?.length || 0,
      // Log properties blocks specifically
      properties: result?.content?.filter((item: any) => item._type === 'properties')
        .map((prop: any) => ({
          title: prop.title,
          itemsCount: prop.items?.length || 0,
          items: prop.items
        }))
    }, null, 2));
  }
  
  return result;
} as typeof client.fetch;
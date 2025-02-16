import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'y3sz9d51',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-02-16', // Use today's date
})
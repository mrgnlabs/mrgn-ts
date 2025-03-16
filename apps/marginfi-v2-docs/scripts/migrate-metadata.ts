const sanityClient = require('@sanity/client')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../.env.local')
})

// Verify environment variables
const requiredEnvVars = ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET', 'SANITY_API_WRITE_TOKEN']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Initialize Sanity client
const client = sanityClient.createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
})

async function migrateMetadata() {
  try {
    // Get all docPage documents
    const docs = await client.fetch('*[_type == "docPage"]')
    console.log(`Found ${docs.length} documents to check`)

    for (const doc of docs) {
      const updates: any = {}
      let hasUpdates = false

      // Ensure metadata object exists
      if (!doc.metadata) {
        updates.metadata = {
          title: doc.title,
          description: '',
          keywords: []
        }
        hasUpdates = true
      } else {
        // Update existing metadata
        updates.metadata = {
          ...doc.metadata,
          title: doc.metadata.title || doc.title
        }
        hasUpdates = true
      }

      if (hasUpdates) {
        await client
          .patch(doc._id)
          .set(updates)
          .commit()
        console.log(`Updated metadata for: ${doc.title}`)
      }
    }

    console.log('Metadata migration completed successfully')
  } catch (error) {
    console.error('Error during metadata migration:', error)
    process.exit(1)
  }
}

// Run the migration
migrateMetadata() 
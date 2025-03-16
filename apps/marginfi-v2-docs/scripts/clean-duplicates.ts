const sanityPkg = require('@sanity/client')
const dotenvPkg = require('dotenv')
const pathPkg = require('path')

// Load environment variables
dotenvPkg.config({
  path: pathPkg.resolve(__dirname, '../.env.local')
})

// Verify environment variables
const requiredEnvVars = ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET', 'SANITY_API_WRITE_TOKEN']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Initialize Sanity client
const sanityClient = sanityPkg.createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
})

async function cleanDuplicates(): Promise<void> {
  try {
    // Get all docPage documents
    const docPages = await sanityClient.fetch('*[_type == "docPage"]')
    console.log(`Found ${docPages.length} documents to check`)

    for (const doc of docPages) {
      const updates: any = {}
      let hasUpdates = false

      // Check for duplicate title in content
      if (doc.title && typeof doc.title === 'string' && doc.content) {
        // Remove any duplicate title fields that might have been added to content
        updates.content = doc.content.filter((block: any) => 
          !(block._type === 'block' && 
            block.style === 'h1' && 
            block.children?.[0]?.text === doc.title)
        )
        if (updates.content.length !== doc.content.length) {
          hasUpdates = true
          console.log(`Removing duplicate title from: ${doc.title}`)
        }
      }

      if (hasUpdates) {
        await sanityClient
          .patch(doc._id)
          .set(updates)
          .commit()
        console.log(`Updated document: ${doc.title}`)
      }
    }

    console.log('Clean-up completed successfully')
  } catch (error) {
    console.error('Error during clean-up:', error)
    process.exit(1)
  }
}

// Run the clean-up
cleanDuplicates() 
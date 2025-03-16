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

// Types
type SanityBlock = {
  _type: string
  _key: string
  style?: string
  markDefs?: Array<{
    _type: string
    _key: string
    variant?: string
    [key: string]: any
  }>
  [key: string]: any
}

// Initialize Sanity client
const sanityClient = sanityPkg.createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
})

function generateKey(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

async function migrateContent(): Promise<void> {
  try {
    // Get all docPage documents
    const docPages = await sanityClient.fetch('*[_type == "docPage"]')

    for (const docPage of docPages) {
      let updated = false
      
      // Process content array
      if (docPage.content) {
        docPage.content = docPage.content.map((block: SanityBlock) => {
          // Add _key if missing
          if (!block._key) {
            block._key = generateKey()
          }

          // Convert section blocks to contentBlock
          if (block._type === 'section') {
            const newBlock: SanityBlock = {
              ...block,
              _type: 'contentBlock',
              type: 'section',
              _key: block._key || generateKey()
            }
            return newBlock
          }

          // Add variant to link annotations if missing
          if (block._type === 'block' && block.markDefs) {
            block.markDefs = block.markDefs.map(mark => ({
              ...mark,
              _key: mark._key || generateKey(),
              variant: mark._type === 'link' ? (mark.variant || 'text') : undefined
            }))
          }

          return block
        })
        updated = true
      }

      if (updated) {
        console.log(`Updating docPage: ${docPage.title}`)
        await sanityClient.createOrReplace(docPage)
      }
    }

    console.log('Content migration completed successfully')
  } catch (error) {
    console.error('Error during content migration:', error)
    process.exit(1)
  }
}

// Run the migration
migrateContent() 
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

function generateKey() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

async function flattenContent() {
  try {
    // Get all docPage documents
    const docs = await client.fetch('*[_type == "docPage"]')
    console.log(`Found ${docs.length} documents to process`)

    for (const doc of docs) {
      console.log(`\nProcessing document: ${doc.title}`)
      if (!doc.content) {
        console.log('No content to flatten, skipping...')
        continue
      }

      const flattenedContent = []
      
      // Process each content block
      for (const block of doc.content) {
        if (block._type === 'section' || block._type === 'contentBlock') {
          console.log(`Found ${block._type}, flattening...`)
          
          // Add title as H2 if it exists
          if (block.title) {
            flattenedContent.push({
              _type: 'block',
              _key: generateKey(),
              style: 'h2',
              children: [{
                _type: 'span',
                text: block.title
              }]
            })
          }

          // Process content array
          const contentArray = block.content || []
          for (const contentBlock of contentArray) {
            if (contentBlock._type === 'properties') {
              // Keep properties block as is with a new key
              flattenedContent.push({
                ...contentBlock,
                _key: contentBlock._key || generateKey()
              })
            } else if (contentBlock._type === 'methodList' || contentBlock._type === 'methodProperties') {
              // Convert old method types to new format
              flattenedContent.push({
                _type: 'method',
                _key: contentBlock._key || generateKey(),
                title: contentBlock.title,
                format: contentBlock._type === 'methodList' ? 'list' : 'detailed',
                items: contentBlock.methods || contentBlock.items || []
              })
            } else if (contentBlock._type === 'block') {
              // Keep block content as is with a new key if needed
              flattenedContent.push({
                ...contentBlock,
                _key: contentBlock._key || generateKey()
              })
            }
          }
        } else {
          // Keep non-section blocks as is
          flattenedContent.push(block)
        }
      }

      // Update the document with flattened content
      console.log('Updating document with flattened content...')
      await client
        .patch(doc._id)
        .set({ content: flattenedContent })
        .commit()
      console.log('✓ Document updated successfully')
    }

    console.log('\n✨ Content flattening completed successfully!')
  } catch (error) {
    console.error('\n❌ Content flattening failed:', error)
    process.exit(1)
  }
}

// Run the migration
flattenContent() 
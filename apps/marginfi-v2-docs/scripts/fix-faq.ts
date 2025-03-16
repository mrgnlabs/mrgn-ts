const { createClient } = require('@sanity/client')
const dotenv = require('dotenv')
const path = require('path')

// Types
/**
 * @typedef {Object} SanityBlock
 * @property {string} _type
 * @property {string} _key
 * @property {string} [style]
 * @property {Array<{_type: string, text: string, marks?: string[]}>} [children]
 */

/**
 * @typedef {Object} DocPage
 * @property {string} _id
 * @property {string} _type
 * @property {string} title
 * @property {{current: string}} slug
 * @property {SanityBlock[]} [content]
 */

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
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
})

/**
 * Generate a unique key
 * @returns {string}
 */
function generateKey() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Fix FAQ content structure
 * @returns {Promise<void>}
 */
async function fixFaqContent() {
  try {
    // Get the FAQ document
    /** @type {DocPage[]} */
    const faqDocs = await client.fetch('*[_type == "docPage" && slug.current == "faq"]')
    
    if (faqDocs.length === 0) {
      console.log('No FAQ document found')
      return
    }
    
    console.log(`Found ${faqDocs.length} FAQ documents`)
    
    for (const doc of faqDocs) {
      console.log(`\nProcessing FAQ: ${doc.title}`)
      
      if (!doc.content || doc.content.length === 0) {
        console.log('No content to fix, skipping...')
        continue
      }
      
      console.log(`Content blocks: ${doc.content.length}`)
      console.log(`Content types: ${doc.content.map(item => item._type).join(', ')}`)
      
      // Ensure all blocks have proper keys and structure
      const fixedContent = doc.content.map(block => {
        // Ensure block has a key
        if (!block._key) {
          block._key = generateKey()
        }
        
        // Fix block structure if needed
        if (block._type === 'block') {
          // Ensure block has style
          if (!block.style) {
            block.style = 'normal'
          }
          
          // Ensure block has children
          if (!block.children || !Array.isArray(block.children) || block.children.length === 0) {
            block.children = [{
              _type: 'span',
              text: block.text || ''
            }]
          }
          
          // Ensure each child has _type
          block.children = block.children.map(child => {
            if (!child._type) {
              return {
                _type: 'span',
                text: child.text || ''
              }
            }
            return child
          })
        }
        
        return block
      })
      
      // Update the document with fixed content
      console.log('Updating document with fixed content...')
      await client
        .patch(doc._id)
        .set({ content: fixedContent })
        .commit()
      
      console.log('✓ FAQ document updated successfully')
    }
    
    console.log('\n✨ FAQ content fixing completed successfully!')
  } catch (error) {
    console.error('\n❌ FAQ content fixing failed:', error)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
fixFaqContent() 
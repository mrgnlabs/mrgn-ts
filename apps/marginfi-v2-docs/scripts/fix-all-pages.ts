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
 * Fix content structure for a document
 * @param {DocPage} doc - The document to fix
 * @returns {Promise<void>}
 */
async function fixDocumentContent(doc) {
  console.log(`\nProcessing document: ${doc.title} (${doc.slug.current})`)
  
  if (!doc.content || doc.content.length === 0) {
    console.log('No content to fix, skipping...')
    return
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
    } else if (block._type === 'section' || block._type === 'contentBlock') {
      // Fix section/contentBlock structure
      if (block.content && Array.isArray(block.content)) {
        block.content = block.content.map(contentItem => {
          if (!contentItem._key) {
            contentItem._key = generateKey()
          }
          
          if (contentItem._type === 'block') {
            if (!contentItem.style) {
              contentItem.style = 'normal'
            }
            
            if (!contentItem.children || !Array.isArray(contentItem.children) || contentItem.children.length === 0) {
              contentItem.children = [{
                _type: 'span',
                text: contentItem.text || ''
              }]
            }
            
            contentItem.children = contentItem.children.map(child => {
              if (!child._type) {
                return {
                  _type: 'span',
                  text: child.text || ''
                }
              }
              return child
            })
          }
          
          return contentItem
        })
      }
    } else if (block._type === 'note') {
      // Fix note structure
      if (block.content && Array.isArray(block.content)) {
        block.content = block.content.map(contentItem => {
          if (!contentItem._key) {
            contentItem._key = generateKey()
          }
          
          if (contentItem._type === 'block') {
            if (!contentItem.style) {
              contentItem.style = 'normal'
            }
            
            if (!contentItem.children || !Array.isArray(contentItem.children) || contentItem.children.length === 0) {
              contentItem.children = [{
                _type: 'span',
                text: contentItem.text || ''
              }]
            }
            
            contentItem.children = contentItem.children.map(child => {
              if (!child._type) {
                return {
                  _type: 'span',
                  text: child.text || ''
                }
              }
              return child
            })
          }
          
          return contentItem
        })
      }
    }
    
    return block
  })
  
  // Update the document with fixed content
  console.log('Updating document with fixed content...')
  await client
    .patch(doc._id)
    .set({ content: fixedContent })
    .commit()
  
  console.log(`✓ Document "${doc.title}" updated successfully`)
}

/**
 * Fix all doc pages content structure
 * @returns {Promise<void>}
 */
async function fixAllPagesContent() {
  try {
    // Get all docPage documents
    /** @type {DocPage[]} */
    const allDocs = await client.fetch('*[_type == "docPage"]')
    
    if (allDocs.length === 0) {
      console.log('No documents found')
      return
    }
    
    console.log(`Found ${allDocs.length} documents to process`)
    
    // Process each document
    for (const doc of allDocs) {
      await fixDocumentContent(doc)
    }
    
    console.log('\n✨ All documents fixed successfully!')
  } catch (error) {
    console.error('\n❌ Document fixing failed:', error)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
fixAllPagesContent() 
const { createClient } = require('@sanity/client')
const dotenv = require('dotenv')
const path = require('path')

// Helper function to generate unique keys
function generateKey() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// Types
type Block = {
  _type: 'block'
  _key: string
  style: string
  children: {
    _type: 'span'
    text: string
  }[]
}

type FAQContent = Block | {
  _type: string
  _key: string
  [key: string]: any
}

interface DocPage {
  _type: 'docPage'
  title: string
  slug: {
    _type: 'slug'
    current: string
  }
  metadata: {
    description?: string
    keywords: string[]
  }
  content: FAQContent[]
}

// Load env from the docs directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Verify environment variables are loaded
if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
  console.error('Error: NEXT_PUBLIC_SANITY_PROJECT_ID is not set in .env.local')
  process.exit(1)
}
if (!process.env.NEXT_PUBLIC_SANITY_DATASET) {
  console.error('Error: NEXT_PUBLIC_SANITY_DATASET is not set in .env.local')
  process.exit(1)
}
if (!process.env.SANITY_API_WRITE_TOKEN) {
  console.error('Error: SANITY_API_WRITE_TOKEN is not set in .env.local')
  console.error('Please create a token with write access from your Sanity project dashboard')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
})

async function migrateFAQContent() {
  console.log('Starting FAQ migration...')
  
  try {
    // 1. Fetch all FAQ documents
    console.log('Fetching FAQ documents...')
    const faqDocs = await client.fetch(`*[_type == "faq"]`)
    console.log(`Found ${faqDocs.length} FAQ documents to migrate`)

    // 2. Process each FAQ document
    for (const faq of faqDocs) {
      console.log(`\nProcessing FAQ: ${faq.title}`)

      // Create a new docPage for each FAQ
      const docPage: DocPage = {
        _type: 'docPage',
        title: faq.title || 'FAQs',
        slug: {
          _type: 'slug',
          current: 'faq'
        },
        metadata: {
          description: faq.metadata?.description || faq.description,
          keywords: ['faq', 'help', 'support']
        },
        content: []
      }

      // Add description as first content block if it exists
      if (faq.description) {
        docPage.content.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          children: [{
            _type: 'span',
            text: faq.description
          }]
        })
      }

      // Process each FAQ question
      if (faq.questions && faq.questions.length > 0) {
        for (const question of faq.questions) {
          // Add question as H2
          docPage.content.push({
            _type: 'block',
            _key: generateKey(),
            style: 'h2',
            children: [{
              _type: 'span',
              text: question.question
            }]
          })

          // Add tag/label if they exist
          if (question.tag || question.label) {
            docPage.content.push({
              _type: 'block',
              _key: generateKey(),
              style: 'normal',
              children: [{
                _type: 'span',
                text: [question.tag, question.label].filter(Boolean).join(' - ')
              }]
            })
          }

          // Add answer content
          if (question.answer) {
            // Make sure each answer block has a _key
            const answersWithKeys = question.answer.map((block: any) => ({
              ...block,
              _key: block._key || generateKey()
            }))
            docPage.content.push(...answersWithKeys)
          }
        }
      }

      // Create the new document
      console.log('Creating new docPage...')
      await client.create(docPage)
      console.log('✓ FAQ migrated successfully')

      // Delete the old FAQ document
      console.log('Deleting old FAQ document...')
      await client.delete(faq._id)
      console.log('✓ Old FAQ document deleted')
    }

    console.log('\n✨ FAQ migration completed successfully!')
  } catch (error) {
    console.error('\n❌ FAQ migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateFAQContent()
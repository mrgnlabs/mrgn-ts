const { createClient } = require('@sanity/client')
const dotenv = require('dotenv')
const path = require('path')

// Types
type MethodBase = {
  _type: 'method'
  _key: string
  format: 'list' | 'detailed' | 'table'
  title: string
  items: any[]
}

type Parameter = {
  name: string
  type: string
  description: string
  optional?: boolean
}

type Method = {
  name: string
  description: string
  parameters?: Parameter[]
  returns?: string
  resultType?: string
  notes?: string
  parametersString?: string
}

type SanityDocument = {
  _id: string
  _type: string
  _rev: string
  content?: Array<{
    _type: string
    _key: string
    [key: string]: any
  }>
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

async function migrateContent() {
  console.log('Starting migration...')
  
  try {
    // 1. Fetch all documents that need migration
    console.log('Fetching documents...')
    const documents = await client.fetch<SanityDocument[]>(`
      *[_type in ["docPage", "section"]] {
        _id,
        _type,
        _rev,
        content[] {
          _type,
          _key,
          ...
        }
      }
    `)
    console.log(`Found ${documents.length} documents to migrate`)

    // 2. Process each document
    for (const doc of documents) {
      console.log(`\nProcessing document: ${doc._id}`)
      if (!doc.content) {
        console.log('No content to migrate, skipping...')
        continue
      }

      const newContent = doc.content.map((item) => {
        // Skip if not a method-related type
        if (!['methodList', 'methodProperties', 'simpleProperties', 'objectProperties'].includes(item._type)) {
          return item
        }

        console.log(`Converting ${item._type} to new method format...`)

        // Convert to new method format based on type
        const baseMethod: Partial<MethodBase> = {
          _type: 'method',
          _key: item._key,
        }

        switch (item._type) {
          case 'methodList': {
            const methods: Method[] = item.methods?.map((method: any) => ({
              name: method.name,
              parametersString: method.arguments,
              description: method.description
            })) || []

            return {
              ...baseMethod,
              format: 'list',
              title: item.title,
              items: methods
            }
          }

          case 'methodProperties': {
            const methods: Method[] = item.items?.map((method: any) => ({
              name: method.name,
              description: method.description,
              parameters: method.parameters,
              returns: method.returns?.description,
              resultType: method.returns?.type,
              notes: method.notes
            })) || []

            return {
              ...baseMethod,
              format: 'detailed',
              title: item.title,
              items: methods
            }
          }

          case 'simpleProperties': {
            const methods: Method[] = item.items?.map((prop: any) => ({
              name: prop.name,
              parametersString: prop.type,
              description: prop.description
            })) || []

            return {
              ...baseMethod,
              format: 'table',
              title: item.title,
              items: methods
            }
          }

          case 'objectProperties': {
            const methods: Method[] = item.items?.map((obj: any) => ({
              name: obj.name,
              description: obj.description,
              parameters: obj.properties?.map((prop: any) => ({
                name: prop.name,
                type: prop.type,
                description: prop.description,
                optional: prop.optional
              }))
            })) || []

            return {
              ...baseMethod,
              format: 'detailed',
              title: item.title,
              items: methods
            }
          }

          default:
            return item
        }
      })

      // 3. Update the document
      console.log('Updating document with new content...')
      await client
        .patch(doc._id)
        .set({ content: newContent })
        .commit()

      console.log('✓ Document updated successfully')
    }

    console.log('\n✨ Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateContent() 
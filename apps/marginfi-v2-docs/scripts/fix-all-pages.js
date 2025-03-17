require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@sanity/client');

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
});

/**
 * Fix the content structure of all docPage documents
 */
async function fixAllPagesContent() {
  try {
    // Fetch all docPage documents
    const query = `*[_type == "docPage"]`;
    const docs = await client.fetch(query);

    if (!docs || docs.length === 0) {
      console.log('No docPage documents found');
      return;
    }

    console.log(`Found ${docs.length} docPage documents`);

    // Process each document
    for (const doc of docs) {
      console.log(`Processing document: ${doc.title}`);

      if (!doc.content || !Array.isArray(doc.content)) {
        console.log(`Document ${doc.title} has no content array`);
        continue;
      }

      // Log the content types
      console.log(`Content types: ${doc.content.map(item => item._type).join(', ')}`);

      // Fix the content structure
      const fixedContent = doc.content.map(block => {
        // If the block is already properly structured, return it as is
        if (block._type !== 'block') {
          return block;
        }

        // Check if the block has children
        if (block.children && Array.isArray(block.children)) {
          // Fix each child
          block.children = block.children.map(child => {
            // Ensure each child has a _key
            if (!child._key) {
              child._key = Math.random().toString(36).substring(2, 15);
            }
            return child;
          });
        }

        // Check if the block has content
        if (block.content && Array.isArray(block.content)) {
          // Fix each content item
          block.content = block.content.map(contentItem => {
            // Ensure each content item has a _key
            if (!contentItem._key) {
              contentItem._key = Math.random().toString(36).substring(2, 15);
            }

            // Check if the content item has children
            if (contentItem.children && Array.isArray(contentItem.children)) {
              // Fix each child
              contentItem.children = contentItem.children.map(child => {
                // Ensure each child has a _key
                if (!child._key) {
                  child._key = Math.random().toString(36).substring(2, 15);
                }
                return child;
              });
            }

            return contentItem;
          });
        }

        return block;
      });

      // Update the document with the fixed content
      const result = await client.patch(doc._id)
        .set({ content: fixedContent })
        .commit();

      console.log(`Updated document: ${result.title}`);
    }

    console.log('Done fixing all docPage content');
  } catch (error) {
    console.error('Error fixing docPage content:', error);
  }
}

// Run the function
fixAllPagesContent(); 
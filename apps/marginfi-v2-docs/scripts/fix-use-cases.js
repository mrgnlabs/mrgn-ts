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

// Helper function to generate a random key
function generateKey() {
  return Math.random().toString(36).substring(2, 15);
}

// Helper function to ensure a block has a _key
function ensureKey(block) {
  if (!block._key) {
    block._key = generateKey();
  }
  return block;
}

// Helper function to fix block structure
function fixBlockStructure(block) {
  // Skip if not a block
  if (!block || typeof block !== 'object') {
    return block;
  }

  // Ensure the block has a _key
  block = ensureKey(block);

  // Fix children if they exist
  if (block.children && Array.isArray(block.children)) {
    block.children = block.children.map(child => {
      if (!child._key) {
        child._key = generateKey();
      }
      return child;
    });
  }

  // Fix content if it exists
  if (block.content && Array.isArray(block.content)) {
    block.content = block.content.map(item => fixBlockStructure(item));
  }

  // Fix items if they exist (for tables, lists, etc.)
  if (block.items && Array.isArray(block.items)) {
    block.items = block.items.map(item => {
      if (typeof item === 'object') {
        return fixBlockStructure(item);
      }
      return item;
    });
  }

  return block;
}

/**
 * Fix the content structure of the Use Cases page
 */
async function fixUseCasesContent() {
  try {
    // Fetch the Use Cases document
    const query = `*[_type == "docPage" && title == "Use Cases"][0]`;
    const doc = await client.fetch(query);

    if (!doc) {
      console.log('Use Cases document not found');
      return;
    }

    console.log(`Processing document: ${doc.title}`);

    if (!doc.content || !Array.isArray(doc.content)) {
      console.log(`Document ${doc.title} has no content array`);
      return;
    }

    // Fix the content structure
    const fixedContent = doc.content.map(block => fixBlockStructure(block));

    // Update the document with the fixed content
    const result = await client.patch(doc._id)
      .set({ content: fixedContent })
      .commit();

    console.log(`Updated document: ${result.title}`);
    console.log('Done fixing Use Cases content');
  } catch (error) {
    console.error('Error fixing Use Cases content:', error);
  }
}

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
      const contentTypes = doc.content.map(item => item?._type || 'unknown').join(', ');
      console.log(`Content types: ${contentTypes}`);

      // Fix the content structure
      const fixedContent = doc.content.map(block => fixBlockStructure(block));

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

// Run the function to fix the Use Cases page
fixUseCasesContent().then(() => {
  console.log('Completed fixing Use Cases page');
  // After fixing Use Cases, fix all other pages
  fixAllPagesContent().then(() => {
    console.log('Completed fixing all pages');
  });
}); 
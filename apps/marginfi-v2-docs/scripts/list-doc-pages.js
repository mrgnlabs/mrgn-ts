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
 * List all docPage documents in the Sanity database
 */
async function listDocPages() {
  try {
    // Fetch all docPage documents
    const query = `*[_type == "docPage"] { _id, title, slug }`;
    const docs = await client.fetch(query);

    if (!docs || docs.length === 0) {
      console.log('No docPage documents found');
      return;
    }

    console.log(`Found ${docs.length} docPage documents:`);
    
    // Print each document's ID and title
    docs.forEach(doc => {
      console.log(`- ID: ${doc._id}, Title: ${doc.title}, Slug: ${doc.slug?.current || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error listing docPage documents:', error);
  }
}

// Run the function
listDocPages(); 
/**
 * This script fixes content rendering issues by ensuring all blocks have proper _key properties
 * and all content is properly structured for rendering with PortableText.
 */

const { createClient } = require('@sanity/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

// Generate a unique key
const generateKey = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};

// Recursively ensure all content blocks have _key properties
const ensureKeys = (content) => {
  if (!content) return content;
  
  // If it's an array, process each item
  if (Array.isArray(content)) {
    return content.map(item => {
      // Skip if null or not an object
      if (!item || typeof item !== 'object') return item;
      
      // Ensure item has a _key
      const itemWithKey = { ...item };
      if (!itemWithKey._key) {
        itemWithKey._key = generateKey();
      }
      
      // Process nested content
      if (itemWithKey.content) {
        itemWithKey.content = ensureKeys(itemWithKey.content);
      }
      
      // Process children
      if (itemWithKey.children) {
        itemWithKey.children = ensureKeys(itemWithKey.children);
      }
      
      // Process markDefs
      if (itemWithKey.markDefs) {
        itemWithKey.markDefs = ensureKeys(itemWithKey.markDefs);
      }
      
      // Process items (for lists, tables, etc.)
      if (itemWithKey.items) {
        itemWithKey.items = ensureKeys(itemWithKey.items);
      }
      
      // Process parameters (for method blocks)
      if (itemWithKey.parameters) {
        itemWithKey.parameters = ensureKeys(itemWithKey.parameters);
      }
      
      return itemWithKey;
    });
  }
  
  // If it's an object but not an array, ensure it has a _key
  if (typeof content === 'object' && content !== null) {
    const contentWithKey = { ...content };
    if (!contentWithKey._key) {
      contentWithKey._key = generateKey();
    }
    
    // Process nested content
    if (contentWithKey.content) {
      contentWithKey.content = ensureKeys(contentWithKey.content);
    }
    
    // Process children
    if (contentWithKey.children) {
      contentWithKey.children = ensureKeys(contentWithKey.children);
    }
    
    // Process markDefs
    if (contentWithKey.markDefs) {
      contentWithKey.markDefs = ensureKeys(contentWithKey.markDefs);
    }
    
    // Process items (for lists, tables, etc.)
    if (contentWithKey.items) {
      contentWithKey.items = ensureKeys(contentWithKey.items);
    }
    
    // Process parameters (for method blocks)
    if (contentWithKey.parameters) {
      contentWithKey.parameters = ensureKeys(contentWithKey.parameters);
    }
    
    return contentWithKey;
  }
  
  return content;
};

// Fix all docPage documents
const fixAllDocPages = async () => {
  try {
    // Fetch all docPage documents
    const query = '*[_type == "docPage"]';
    const docPages = await client.fetch(query);
    
    console.log(`Found ${docPages.length} docPage documents to process`);
    
    // Process each document
    for (const doc of docPages) {
      console.log(`Processing document: ${doc.title || doc._id}`);
      
      // Ensure leadText has keys
      if (doc.leadText) {
        doc.leadText = ensureKeys(doc.leadText);
      }
      
      // Ensure content has keys
      if (doc.content) {
        doc.content = ensureKeys(doc.content);
      }
      
      // Update the document
      await client.patch(doc._id)
        .set({
          leadText: doc.leadText,
          content: doc.content
        })
        .commit();
      
      console.log(`Updated document: ${doc.title || doc._id}`);
    }
    
    console.log('All documents processed successfully');
  } catch (error) {
    console.error('Error processing documents:', error);
  }
};

// Run the fix
fixAllDocPages(); 
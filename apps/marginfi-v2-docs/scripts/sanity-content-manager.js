/**
 * Sanity Content Manager
 * 
 * A comprehensive script for managing Sanity content:
 * 1. Converting MDX to Sanity blocks with proper structure (including special handling for Use Cases)
 * 2. Fixing section blocks and other content issues
 * 3. Cleaning up problematic blocks
 * 
 * Usage:
 *   node scripts/sanity-content-manager.js --fix-section-blocks
 *   node scripts/sanity-content-manager.js --convert-mdx
 *   node scripts/sanity-content-manager.js --fix-all
 */

const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2023-05-03',
});

// Helper function to generate a unique key
function generateKey() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

/**
 * Fix section blocks to ensure they have proper content arrays
 * @param {Array} blocks - The blocks to fix
 * @returns {Array} - The fixed blocks
 */
function fixSectionBlocks(blocks) {
  return blocks.map(block => {
    // If it's a section block without content, add an empty content array
    if (block._type === 'section') {
      if (!block.content || !Array.isArray(block.content)) {
        block.content = [
          {
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: ''
              }
            ]
          }
        ];
      } else {
        // Ensure all content items have _key and _type
        block.content = block.content.map(item => {
          if (!item._key) {
            item._key = generateKey();
          }
          if (!item._type && typeof item === 'object') {
            item._type = 'block';
          }
          return item;
        });
      }
    }
    
    // If it's a contentBlock, ensure it has a content array
    if (block._type === 'contentBlock') {
      if (!block.content || !Array.isArray(block.content)) {
        block.content = [
          {
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: ''
              }
            ]
          }
        ];
      } else {
        // Ensure all content items have _key and _type
        block.content = block.content.map(item => {
          if (!item._key) {
            item._key = generateKey();
          }
          if (!item._type && typeof item === 'object') {
            item._type = 'block';
          }
          return item;
        });
      }
    }
    
    // If it's a note block, ensure it has a content array
    if (block._type === 'note') {
      if (!block.content || !Array.isArray(block.content)) {
        block.content = [
          {
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: ''
              }
            ]
          }
        ];
      } else {
        // Ensure all content items have _key and _type
        block.content = block.content.map(item => {
          if (!item._key) {
            item._key = generateKey();
          }
          if (!item._type && typeof item === 'object') {
            item._type = 'block';
          }
          return item;
        });
      }
    }
    
    // Ensure all blocks have a _key
    if (!block._key) {
      block._key = generateKey();
    }
    
    return block;
  });
}

/**
 * Fix a single document's content
 * @param {Object} doc - The document to fix
 * @returns {Promise<void>}
 */
async function fixDocument(doc) {
  try {
    console.log(`\nProcessing document: ${doc.title} (${doc.slug?.current || 'no-slug'})`);
    
    if (!doc.content || !Array.isArray(doc.content)) {
      console.log(`Document ${doc.title} has no content array`);
      return;
    }
    
    // Fix section blocks
    const fixedContent = fixSectionBlocks(doc.content);
    
    // Update the document with the fixed content
    const result = await client.patch(doc._id)
      .set({ content: fixedContent })
      .commit();
    
    console.log(`✓ Updated document: ${result.title}`);
  } catch (error) {
    console.error(`✗ Error fixing document ${doc.title}:`, error);
  }
}

/**
 * Fix the Use Cases page specifically
 */
async function fixUseCasesPage() {
  try {
    // Fetch the Use Cases document
    const query = `*[_type == "docPage" && slug.current == "use-cases"][0]`;
    const doc = await client.fetch(query);
    
    if (!doc) {
      console.log('Use Cases document not found');
      return;
    }
    
    console.log(`Processing Use Cases document: ${doc.title}`);
    
    if (!doc.content || !Array.isArray(doc.content)) {
      console.log(`Document ${doc.title} has no content array`);
      return;
    }
    
    // Find all section blocks
    const sectionBlocks = doc.content.filter(block => block._type === 'section');
    console.log(`Found ${sectionBlocks.length} section blocks`);
    
    // Create a new content array with fixed section blocks
    const fixedContent = doc.content.map(block => {
      if (block._type === 'section') {
        // Ensure section has a content array
        if (!block.content || !Array.isArray(block.content)) {
          block.content = [
            {
              _type: 'block',
              _key: generateKey(),
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: generateKey(),
                  text: ''
                }
              ]
            }
          ];
        }
      }
      return block;
    });
    
    // Update the document with the fixed content
    const result = await client.patch(doc._id)
      .set({ content: fixedContent })
      .commit();
    
    console.log(`✓ Updated Use Cases document: ${result.title}`);
  } catch (error) {
    console.error('Error fixing Use Cases document:', error);
  }
}

/**
 * Fix all docPage documents
 */
async function fixAllDocuments() {
  try {
    // Fetch all docPage documents
    const query = `*[_type == "docPage"]`;
    const docs = await client.fetch(query);
    
    if (!docs || docs.length === 0) {
      console.log('No docPage documents found');
      return;
    }
    
    console.log(`Found ${docs.length} docPage documents to process`);
    
    // Process each document
    for (const doc of docs) {
      await fixDocument(doc);
    }
    
    console.log('\n✨ All documents processed successfully!');
  } catch (error) {
    console.error('\n❌ Error processing documents:', error);
  }
}

/**
 * Convert MDX content to Sanity blocks with proper structure
 * @param {string} content - The MDX content
 * @returns {Array} - The Sanity blocks
 */
function mdxToSanityBlocks(content) {
  // Split content by lines
  const lines = content.split('\n');
  const blocks = [];
  
  let currentBlock = null;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  let codeBlockTitle = '';
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockContent = '';
        
        // Extract language and title information
        const codeBlockInfo = line.slice(3).trim();
        const titleMatch = codeBlockInfo.match(/{{[ ]*title:[ ]*['"](.+?)['"][ ]*}}/);
        
        if (titleMatch) {
          codeBlockTitle = titleMatch[1].trim();
          codeBlockLanguage = codeBlockInfo.replace(titleMatch[0], '').trim();
        } else {
          codeBlockTitle = '';
          codeBlockLanguage = codeBlockInfo;
        }
        
        console.log(`Processing code block: language=${codeBlockLanguage}, title=${codeBlockTitle || 'none'}`);
      } else {
        // End of code block
        inCodeBlock = false;
        blocks.push({
          _type: 'code',
          _key: generateKey(),
          language: codeBlockLanguage || 'javascript',
          code: codeBlockContent.trim(),
          filename: codeBlockTitle || ''
        });
        
        console.log(`Added code block: ${codeBlockContent.length} chars, language=${codeBlockLanguage}, filename=${codeBlockTitle || 'none'}`);
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    // Handle headings
    if (line.startsWith('# ')) {
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'h1',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: line.slice(2).trim()
          }
        ]
      });
    } else if (line.startsWith('## ')) {
      // Check for tags and labels in h2
      const h2Content = line.slice(3).trim();
      const tagMatch = h2Content.match(/{{[ ]*tag:[ ]*['"](.+?)['"][ ]*,[ ]*label:[ ]*['"](.+?)['"][ ]*}}/);
      const anchorMatch = h2Content.match(/{{[ ]*anchor:[ ]*['"]?(.+?)['"]?[ ]*}}/);
      
      if (tagMatch) {
        const title = h2Content.replace(tagMatch[0], '').trim();
        // Create a section block with a proper content array
        blocks.push({
          _type: 'section',
          _key: generateKey(),
          title: title,
          label: `${tagMatch[1]} - ${tagMatch[2]}`,
          content: [
            {
              _type: 'block',
              _key: generateKey(),
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: generateKey(),
                  text: ''
                }
              ]
            }
          ]
        });
      } else if (anchorMatch) {
        const title = h2Content.replace(anchorMatch[0], '').trim();
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'h2',
          children: [
            {
              _type: 'span',
              _key: generateKey(),
              text: title
            }
          ]
        });
      } else {
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'h2',
          children: [
            {
              _type: 'span',
              _key: generateKey(),
              text: h2Content
            }
          ]
        });
      }
    } else if (line.startsWith('### ')) {
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'h3',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: line.slice(4).trim()
          }
        ]
      });
    } else if (line.startsWith('- ')) {
      // Handle list items
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: 'bullet',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: line.slice(2).trim()
          }
        ]
      });
    } else if (line.startsWith('> ')) {
      // Handle blockquotes
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'blockquote',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: line.slice(2).trim()
          }
        ]
      });
    } else if (line.trim() === '---') {
      // Handle horizontal rules - we'll just add a paragraph with a line
      blocks.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: '---'
          }
        ]
      });
    } else if (line.trim() === '') {
      // Skip empty lines
      continue;
    } else {
      // Handle regular paragraphs
      // Check for lead text
      const leadMatch = line.match(/{{[ ]*className:[ ]*['"]lead['"][ ]*}}/);
      if (leadMatch) {
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'lead',
          children: [
            {
              _type: 'span',
              _key: generateKey(),
              text: line.replace(leadMatch[0], '').trim()
            }
          ]
        });
      } else {
        // Check for bold text
        let text = line.trim();
        const boldRegex = /\*\*([^*]+)\*\*/g;
        const spans = [];
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(text)) !== null) {
          // Add text before the bold part
          if (match.index > lastIndex) {
            spans.push({
              _type: 'span',
              _key: generateKey(),
              text: text.substring(lastIndex, match.index)
            });
          }
          
          // Add the bold part
          spans.push({
            _type: 'span',
            _key: generateKey(),
            text: match[1],
            marks: ['strong']
          });
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text
        if (lastIndex < text.length) {
          spans.push({
            _type: 'span',
            _key: generateKey(),
            text: text.substring(lastIndex)
          });
        }
        
        // If no bold text was found, just add the whole line
        if (spans.length === 0) {
          spans.push({
            _type: 'span',
            _key: generateKey(),
            text: text
          });
        }
        
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          children: spans
        });
      }
    }
  }
  
  return blocks;
}

/**
 * Convert MDX files to Sanity documents
 */
async function convertMdxToSanity() {
  try {
    // Get all MDX files
    const mdxFiles = glob.sync('src/app/**/_dep/page.mdx');
    
    console.log(`Found ${mdxFiles.length} MDX files to process`);
    
    // Process each file
    for (const mdxFile of mdxFiles) {
      console.log(`\nProcessing: ${mdxFile}`);
      
      // Read the MDX file
      const mdxContent = fs.readFileSync(path.resolve(process.cwd(), mdxFile), 'utf8');
      
      // Parse frontmatter
      const { data, content } = matter(mdxContent);
      
      // Extract slug from file path
      // Windows uses backslashes, so normalize the path first
      const normalizedPath = mdxFile.replace(/\\/g, '/');
      // Convert path like "src/app/(site)/the-arena/_dep/page.mdx" to "the-arena"
      const parts = normalizedPath.split('/');
      const siteIndex = parts.indexOf('(site)');
      
      if (siteIndex === -1 || siteIndex + 1 >= parts.length) {
        console.log(`Could not extract slug from file path: ${mdxFile}`);
        continue;
      }
      
      const slug = parts[siteIndex + 1];
      console.log(`Slug: ${slug}`);
      
      // Process content based on the page type
      let blocks;
      
      if (slug === 'use-cases') {
        // Special handling for Use Cases page
        blocks = processUseCasesPage(content);
      } else {
        // Standard processing for other pages
        blocks = mdxToSanityBlocks(content);
      }
      
      // Check if the document already exists
      const existingDoc = await client.fetch(`*[_type == "docPage" && slug.current == "${slug}"][0]`);
      
      if (existingDoc) {
        // Update the existing document
        const result = await client.patch(existingDoc._id)
          .set({ content: blocks })
          .commit();
        
        console.log(`Updated document: ${result.title}`);
      } else {
        // Create a new document
        const result = await client.create({
          _type: 'docPage',
          title: data.title || slug,
          slug: {
            _type: 'slug',
            current: slug
          },
          content: blocks
        });
        
        console.log(`Created document: ${result.title}`);
      }
    }
    
    console.log('\nDone converting MDX files to Sanity documents');
  } catch (error) {
    console.error('Error converting MDX files:', error);
  }
}

/**
 * Process the Use Cases page content
 * @param {string} content - The MDX content
 * @returns {Array} - The Sanity blocks
 */
function processUseCasesPage(content) {
  console.log('Processing Use Cases page with special handling...');
  
  // Create blocks for the content
  const blocks = [];
  
  // Add title
  blocks.push({
    _type: 'block',
    _key: generateKey(),
    style: 'h1',
    children: [
      {
        _type: 'span',
        _key: generateKey(),
        text: 'Use Cases'
      }
    ]
  });
  
  // Add lead text
  blocks.push({
    _type: 'block',
    _key: generateKey(),
    style: 'lead',
    children: [
      {
        _type: 'span',
        _key: generateKey(),
        text: 'Below are some ideas for the kinds of applications you can build on the marginfi Liquidity Layer. For integrations assistance, please contact @nathanzebedee on Telegram.'
      }
    ]
  });
  
  // Parse the content to extract use cases
  const lines = content.split('\n');
  let currentSection = null;
  let sectionContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and the title/lead text we've already added
    if (line === '' || line.startsWith('# Use Cases') || line.includes('{{ className: \'lead\' }}')) {
      continue;
    }
    
    // Skip horizontal rule
    if (line === '---') {
      continue;
    }
    
    // Look for section headers (## Title)
    if (line.startsWith('## ')) {
      // If we were processing a section, add it to blocks
      if (currentSection) {
        // Add the section with its content
        blocks.push({
          _type: 'section',
          _key: generateKey(),
          title: currentSection.title,
          label: currentSection.label,
          content: sectionContent.length > 0 ? sectionContent : [
            {
              _type: 'block',
              _key: generateKey(),
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  _key: generateKey(),
                  text: ''
                }
              ]
            }
          ]
        });
        
        // Reset for next section
        sectionContent = [];
      }
      
      // Extract title and any tag/label
      const titleLine = line.slice(3);
      const tagMatch = titleLine.match(/{{[ ]*tag:[ ]*['"](.+?)['"][ ]*,[ ]*label:[ ]*['"](.+?)['"][ ]*}}/);
      
      let title = titleLine;
      let label = '';
      
      if (tagMatch) {
        title = titleLine.replace(tagMatch[0], '').trim();
        label = `${tagMatch[1]} - ${tagMatch[2]}`;
      }
      
      // Start a new section
      currentSection = {
        title: title,
        label: label
      };
    } 
    // Look for bullet points
    else if (line.startsWith('- ')) {
      // Add to current section content
      sectionContent.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        listItem: 'bullet',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: line.slice(2).trim()
          }
        ]
      });
    }
    // Regular paragraph
    else {
      // Add to current section content
      sectionContent.push({
        _type: 'block',
        _key: generateKey(),
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: generateKey(),
            text: line
          }
        ]
      });
    }
  }
  
  // If we were processing a section at the end, add it
  if (currentSection) {
    blocks.push({
      _type: 'section',
      _key: generateKey(),
      title: currentSection.title,
      label: currentSection.label,
      content: sectionContent.length > 0 ? sectionContent : [
        {
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: generateKey(),
              text: ''
            }
          ]
        }
      ]
    });
  }
  
  return blocks;
}

/**
 * Remove problematic blocks from a document
 * @param {string} docId - The document ID
 * @param {string} blockKey - The block key to remove
 */
async function removeProblematicBlock(docId, blockKey) {
  try {
    // Fetch the document
    const doc = await client.getDocument(docId);
    
    if (!doc) {
      console.log(`Document ${docId} not found`);
      return;
    }
    
    console.log(`Removing block ${blockKey} from document ${doc.title}`);
    
    // Filter out the problematic block
    const fixedContent = doc.content.filter(block => block._key !== blockKey);
    
    // Update the document
    const result = await client.patch(docId)
      .set({ content: fixedContent })
      .commit();
    
    console.log(`Updated document: ${result.title}`);
  } catch (error) {
    console.error(`Error removing block from document ${docId}:`, error);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('--fix-section-blocks')) {
    console.log('Fixing section blocks in all documents...');
    fixAllDocuments();
  } else if (args.includes('--convert-mdx')) {
    console.log('Converting MDX files to Sanity documents...');
    convertMdxToSanity();
  } else if (args.includes('--fix-all')) {
    console.log('Running all fixes...');
    fixAllDocuments();
  } else if (args.includes('--remove-block')) {
    const docId = args[args.indexOf('--remove-block') + 1];
    const blockKey = args[args.indexOf('--remove-block') + 2];
    
    if (!docId || !blockKey) {
      console.log('Usage: node scripts/sanity-content-manager.js --remove-block <docId> <blockKey>');
      return;
    }
    
    removeProblematicBlock(docId, blockKey);
  } else {
    console.log(`
Sanity Content Manager

Usage:
  node scripts/sanity-content-manager.js --fix-section-blocks  # Fix section blocks in all documents
  node scripts/sanity-content-manager.js --convert-mdx         # Convert MDX files to Sanity documents (includes use-cases)
  node scripts/sanity-content-manager.js --fix-all             # Run all fixes
  node scripts/sanity-content-manager.js --remove-block <docId> <blockKey>  # Remove a problematic block
    `);
  }
}

// Run the script
parseArgs(); 
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
  
  // Note block handling
  let inNoteBlock = false;
  let noteContent = [];
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Note blocks
    if (line.trim() === '<Note>' || line.trim().startsWith('<Note>')) {
      inNoteBlock = true;
      noteContent = [];
      
      // Extract any content after the opening tag
      if (line.trim() !== '<Note>') {
        const parts = line.split('<Note>');
        if (parts[1] && parts[1].trim()) {
          noteContent.push({
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: parts[1].trim()
              }
            ]
          });
        }
      }
      continue;
    }

    if (line.trim() === '</Note>' || line.trim().endsWith('</Note>')) {
      inNoteBlock = false;
      
      // Extract any content before the closing tag
      if (line.trim() !== '</Note>') {
        const parts = line.split('</Note>');
        if (parts[0] && parts[0].trim()) {
          noteContent.push({
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: parts[0].trim()
              }
            ]
          });
        }
      }
      
      // Create a note block
      blocks.push({
        _type: 'note',
        _key: generateKey(),
        content: noteContent
      });
      
      continue;
    }

    if (inNoteBlock) {
      // Process the line for any Button tags or empty <> tags
      if (line.trim()) {
        let processedLine = line;
        
        // Process Button tags
        const buttonRegex = /<Button\s+href="([^"]+)"(?:\s+variant="([^"]+)")?>(.*?)<\/Button>/g;
        let result;
        
        if (buttonRegex.test(processedLine)) {
          let lastIndex = 0;
          let processedParts = [];
          buttonRegex.lastIndex = 0; // Reset regex state
          
          while ((result = buttonRegex.exec(processedLine)) !== null) {
            // Add text before the button
            if (result.index > lastIndex) {
              processedParts.push(processedLine.substring(lastIndex, result.index));
            }
            
            // Extract button info
            const href = result[1];
            const variant = result[2] || 'text';
            let content = result[3];
            
            // If content has <> tags, clean them up
            if (content.startsWith('<>') && content.endsWith('</>')) {
              content = content.replace(/<>|<\/>/g, '');
            }
            
            // Create a special link marker
            processedParts.push(`__LINK[${href}|${variant}|${content}]__`);
            
            lastIndex = result.index + result[0].length;
          }
          
          // Add any remaining text
          if (lastIndex < processedLine.length) {
            processedParts.push(processedLine.substring(lastIndex));
          }
          
          processedLine = processedParts.join('');
        }
        
        // Clean up any empty <> tags
        processedLine = processedLine.replace(/<>([^<]*)<\/>/g, '$1');
        
        // Add to note content
        if (processedLine.trim()) {
          const children = [];
          
          // Check for link markers and convert them to spans with link marks
          if (processedLine.includes('__LINK[')) {
            const linkRegex = /__LINK\[([^|]+)\|([^|]+)\|([^\]]+)\]__/g;
            let lastLinkIndex = 0;
            let linkResult;
            
            while ((linkResult = linkRegex.exec(processedLine)) !== null) {
              // Add text before the link
              if (linkResult.index > lastLinkIndex) {
                children.push({
                  _type: 'span',
                  _key: generateKey(),
                  text: processedLine.substring(lastLinkIndex, linkResult.index)
                });
              }
              
              // Create link span
              const href = linkResult[1];
              const variant = linkResult[2];
              const text = linkResult[3];
              
              children.push({
                _type: 'span',
                _key: generateKey(),
                text: text,
                marks: ['link'],
                markDefs: [{
                  _type: 'link',
                  _key: generateKey(),
                  href: href,
                  isButton: true,
                  variant: variant
                }]
              });
              
              lastLinkIndex = linkResult.index + linkResult[0].length;
            }
            
            // Add any remaining text
            if (lastLinkIndex < processedLine.length) {
              children.push({
                _type: 'span',
                _key: generateKey(),
                text: processedLine.substring(lastLinkIndex)
              });
            }
          } else {
            // No links, just add the text
            children.push({
              _type: 'span',
              _key: generateKey(),
              text: processedLine
            });
          }
          
          noteContent.push({
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: children
          });
        }
      }
      continue;
    }
    
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
    
    // Handle regular content lines
    if (line.trim()) {
      // Process line for Button tags and <> tags
      let processedLine = line;
      
      // Process Button tags
      const buttonRegex = /<Button\s+href="([^"]+)"(?:\s+variant="([^"]+)")?>(.*?)<\/Button>/g;
      let buttonMatch;
      
      if (buttonRegex.test(processedLine)) {
        let lastIndex = 0;
        let processedParts = [];
        buttonRegex.lastIndex = 0; // Reset regex state
        
        while ((buttonMatch = buttonRegex.exec(processedLine)) !== null) {
          // Add text before the button
          if (buttonMatch.index > lastIndex) {
            processedParts.push(processedLine.substring(lastIndex, buttonMatch.index));
          }
          
          // Extract button info
          const href = buttonMatch[1];
          const variant = buttonMatch[2] || 'text';
          let content = buttonMatch[3];
          
          // If content has <> tags, clean them up
          if (content.startsWith('<>') && content.endsWith('</>')) {
            content = content.replace(/<>|<\/>/g, '');
          }
          
          // Create a special link marker
          processedParts.push(`__LINK[${href}|${variant}|${content}]__`);
          
          lastIndex = buttonMatch.index + buttonMatch[0].length;
        }
        
        // Add any remaining text
        if (lastIndex < processedLine.length) {
          processedParts.push(processedLine.substring(lastIndex));
        }
        
        processedLine = processedParts.join('');
      }
      
      // Clean up any empty <> tags
      processedLine = processedLine.replace(/<>([^<]*)<\/>/g, '$1');
      
      // Continue with handling different types of content
      // ... rest of your existing line handling code ...
      
      // Create span children for the block, handling link markers
      const children = [];
      
      // Check for link markers and convert them to spans with link marks
      if (processedLine.includes('__LINK[')) {
        const linkRegex = /__LINK\[([^|]+)\|([^|]+)\|([^\]]+)\]__/g;
        let lastLinkIndex = 0;
        let linkResult;
        
        while ((linkResult = linkRegex.exec(processedLine)) !== null) {
          // Add text before the link
          if (linkResult.index > lastLinkIndex) {
            children.push({
              _type: 'span',
              _key: generateKey(),
              text: processedLine.substring(lastLinkIndex, linkResult.index)
            });
          }
          
          // Create link span
          const href = linkResult[1];
          const variant = linkResult[2];
          const text = linkResult[3];
          
          children.push({
            _type: 'span',
            _key: generateKey(),
            text: text,
            marks: ['link'],
            markDefs: [{
              _type: 'link',
              _key: generateKey(),
              href: href,
              isButton: true,
              variant: variant
            }]
          });
          
          lastLinkIndex = linkResult.index + linkResult[0].length;
        }
        
        // Add any remaining text
        if (lastLinkIndex < processedLine.length) {
          children.push({
            _type: 'span',
            _key: generateKey(),
            text: processedLine.substring(lastLinkIndex)
          });
        }
      } else {
        // No links, just add the text
        children.push({
          _type: 'span',
          _key: generateKey(),
          text: processedLine
        });
      }
      
      // Handle different line types (headings, lists, etc.)
      if (line.startsWith('# ')) {
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'h1',
          children: children
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
    
    // Also process existing documents that have HTML tags in content
    await fixExistingDocumentsTags();
    
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
 * Fix existing Sanity documents that have HTML tags in their content
 */
async function fixExistingDocumentsTags() {
  console.log('\nFixing existing documents with HTML tags in content...');
  
  try {
    // Get specific documents that need fixing (ts-sdk and any others with HTML tags)
    const documents = await client.fetch(`*[_type == "docPage" && (slug.current == "ts-sdk")]`);
    
    console.log(`Found ${documents.length} documents to fix`);
    
    for (const doc of documents) {
      console.log(`\nFixing document: ${doc.title} (${doc.slug.current})`);
      
      // Special handling for ts-sdk Note with GitHub link
      if (doc.slug.current === "ts-sdk") {
        console.log("Applying special fix for ts-sdk GitHub link in Note...");
        
        // Find the Note block that contains "Access the TypeScript SDK"
        if (doc.content && Array.isArray(doc.content)) {
          for (let i = 0; i < doc.content.length; i++) {
            const block = doc.content[i];
            
            if (block._type === "note" && block.content && Array.isArray(block.content)) {
              // Check if this is the note we're looking for
              const isTargetNote = block.content.some(contentBlock => 
                contentBlock._type === 'block' && 
                contentBlock.children && 
                contentBlock.children.some(child => 
                  child._type === 'span' && 
                  typeof child.text === 'string' && 
                  child.text.includes('Access the TypeScript SDK')
                )
              );
              
              if (isTargetNote) {
                console.log("Found the target Note block!");
                
                // Update the content of the Note to include the GitHub link properly
                const updatedNoteContent = block.content.map(contentBlock => {
                  if (contentBlock._type === 'block' && contentBlock.children) {
                    // Find the specific text span
                    const updatedChildren = contentBlock.children.map(child => {
                      if (child._type === 'span' && 
                          typeof child.text === 'string' && 
                          child.text.includes('this link')) {
                        
                        // Create a link child with proper attributes
                        return {
                          _key: generateKey(),
                          _type: 'span',
                          text: 'this link',
                          marks: ['link'],
                          markDefs: [{
                            _key: generateKey(),
                            _type: 'link',
                            href: 'https://github.com/mrgnlabs/mrgn-ts/tree/main/packages/marginfi-client-v2',
                            isButton: true,
                            variant: 'text'
                          }]
                        };
                      }
                      return child;
                    });
                    
                    return {
                      ...contentBlock,
                      children: updatedChildren
                    };
                  }
                  return contentBlock;
                });
                
                // Update the Note block with fixed content
                doc.content[i] = {
                  ...block,
                  content: updatedNoteContent
                };
                
                // Save the updated document
                const result = await client.patch(doc._id)
                  .set({ content: doc.content })
                  .commit();
                
                console.log(`Updated document with fixed GitHub link: ${result.title}`);
                break;
              }
            }
          }
        }
      }
      
      // Process the content blocks
      if (doc.content && Array.isArray(doc.content)) {
        let modified = false;
        
        // First, pre-process blocks to properly format buttons
        let processedBlocks = [];
        
        for (let block of doc.content) {
          if (block._type === 'block' && block.children && Array.isArray(block.children)) {
            // Check if the block has any Button or Note tags
            const hasHtmlTags = block.children.some(child => 
              child._type === 'span' && 
              typeof child.text === 'string' && 
              (child.text.includes('<Button') || 
               child.text.includes('<Note>') || 
               child.text.includes('</Note>'))
            );
            
            if (hasHtmlTags) {
              modified = true;
            }
            
            // Process any Button tags in this block
            const buttonProcessedBlocks = processTextBlockWithTags(block);
            processedBlocks = processedBlocks.concat(buttonProcessedBlocks);
          } else {
            // Non-text block, add as is
            processedBlocks.push(block);
          }
        }
        
        // Then, process the blocks to handle Note tags
        if (modified) {
          const finalBlocks = processBlocksWithNoteTags(processedBlocks);
          
          // Also handle empty <> tags in all text blocks
          const cleanedBlocks = finalBlocks.map(block => {
            if (block._type === 'block' && block.children && Array.isArray(block.children)) {
              const cleanedChildren = block.children.map(child => {
                if (child._type === 'span' && typeof child.text === 'string') {
                  // Clean up any remaining <> tags
                  const cleanedText = child.text.replace(/<>([^<]*)<\/>/g, '$1');
                  return {
                    ...child,
                    text: cleanedText
                  };
                }
                return child;
              });
              
              return {
                ...block,
                children: cleanedChildren
              };
            }
            return block;
          });
          
          // Update the document with the fixed content
          const result = await client.patch(doc._id)
            .set({ content: cleanedBlocks })
            .commit();
          
          console.log(`Updated document with fixed HTML tags: ${result.title}`);
        } else {
          console.log(`No HTML tags found in document: ${doc.title}`);
        }
      }
    }
    
    console.log('\nDone fixing existing documents with HTML tags');
  } catch (error) {
    console.error('Error fixing existing documents:', error);
  }
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
  const options = {
    fixSectionBlocks: false,
    convertMdx: false,
    fixAllDocuments: false,
    removeBlock: false,
    fixHtmlTags: false,
    docId: null,
    blockKey: null
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--fix-section-blocks') {
      options.fixSectionBlocks = true;
    } else if (arg === '--convert-mdx') {
      options.convertMdx = true;
    } else if (arg === '--fix-all') {
      options.fixAllDocuments = true;
    } else if (arg === '--fix-html-tags') {
      options.fixHtmlTags = true;
    } else if (arg === '--remove-block') {
      options.removeBlock = true;
      options.docId = args[i + 1];
      options.blockKey = args[i + 2];
      i += 2;
    }
  }

  if (!options.fixSectionBlocks && !options.convertMdx && !options.fixAllDocuments && !options.removeBlock && !options.fixHtmlTags) {
    console.log(`
Usage: node scripts/sanity-content-manager.js [options]

Options:
  --fix-section-blocks       Fix section blocks in Sanity documents
  --convert-mdx              Convert MDX files to Sanity documents (including use cases)
  --fix-all                  Fix all issues in Sanity documents
  --fix-html-tags            Fix HTML tags in existing Sanity documents
  --remove-block <docId> <blockKey>  Remove a block from a Sanity document
`);
    process.exit(1);
  }

  return options;
}

// Run the script
const options = parseArgs();

if (options.fixSectionBlocks) {
  console.log('Fixing section blocks in all documents...');
  fixAllDocuments();
} else if (options.convertMdx) {
  console.log('Converting MDX files to Sanity documents...');
  convertMdxToSanity();
} else if (options.fixAllDocuments) {
  console.log('Running all fixes...');
  fixAllDocuments();
} else if (options.removeBlock) {
  removeProblematicBlock(options.docId, options.blockKey);
} else if (options.fixHtmlTags) {
  console.log('Fixing HTML tags in existing documents...');
  fixExistingDocumentsTags();
} 

/**
 * Process a text block that may contain Button tags and convert them to proper Sanity link blocks
 * @param {object} block - The block object to process
 * @returns {Array} - Array of blocks (may include the original block and any new button blocks)
 */
function processTextBlockWithTags(block) {
  if (!block || !block.children || !Array.isArray(block.children)) {
    return [block];
  }

  // Check if any children contain button or note tags
  const hasButtonOrNoteTags = block.children.some(child => 
    child._type === 'span' && 
    typeof child.text === 'string' && 
    (child.text.includes('<Button') || child.text.includes('<Note>'))
  );

  if (!hasButtonOrNoteTags) {
    return [block];
  }

  const resultBlocks = [];
  let currentTextParts = [];

  // Process each child
  for (const child of block.children) {
    if (child._type === 'span' && typeof child.text === 'string') {
      // Look for Button tags
      const buttonRegex = /<Button\s+href="([^"]+)"(?:\s+variant="([^"]+)")?>(.*?)<\/Button>/g;
      let lastIndex = 0;
      let buttonMatch;
      let modifiedText = child.text;
      
      // First collect all non-Button text
      while ((buttonMatch = buttonRegex.exec(child.text)) !== null) {
        // Add text before the button
        if (buttonMatch.index > lastIndex) {
          const textBefore = child.text.substring(lastIndex, buttonMatch.index);
          currentTextParts.push({
            _type: 'span',
            _key: generateKey(),
            text: textBefore,
            marks: child.marks || []
          });
        }
        
        // Extract button info
        const href = buttonMatch[1];
        const variant = buttonMatch[2] || 'text';
        let content = buttonMatch[3];
        
        // If content has <> tags, clean them up
        if (content.startsWith('<>') && content.endsWith('</>')) {
          content = content.replace(/<>|<\/>/g, '');
        }
        
        // Create a marked span for the button instead of a separate block
        // This keeps the button inline with the text
        currentTextParts.push({
          _type: 'span',
          _key: generateKey(),
          text: content,
          marks: ['link'],
          markDefs: [{
            _type: 'link',
            _key: generateKey(),
            href: href,
            isButton: true,
            variant: variant || 'text'
          }]
        });
        
        lastIndex = buttonMatch.index + buttonMatch[0].length;
      }
      
      // Add any remaining text
      if (lastIndex < child.text.length) {
        currentTextParts.push({
          _type: 'span',
          _key: generateKey(),
          text: child.text.substring(lastIndex),
          marks: child.marks || []
        });
      }
    } else {
      // Non-span child, add as is
      currentTextParts.push(child);
    }
  }

  // Create the final result block with the processed text parts
  if (currentTextParts.length > 0) {
    resultBlocks.push({
      ...block,
      children: currentTextParts
    });
  }

  return resultBlocks;
}

/**
 * Process blocks that may contain Note tags and convert them to proper Sanity note blocks
 * @param {Array} blocks - Array of content blocks to process
 * @returns {Array} - Processed blocks with proper Note blocks
 */
function processBlocksWithNoteTags(blocks) {
  const result = [];
  let collectingNote = false;
  let noteContent = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Check if this block starts a note
    if (block._type === 'block' && block.children && 
        block.children.some(child => 
          child._type === 'span' && 
          typeof child.text === 'string' && 
          child.text.includes('<Note>'))) {
      
      collectingNote = true;
      noteContent = [];
      
      // Extract text after <Note> and create a new block for it
      const newChildren = [];
      for (const child of block.children) {
        if (child._type === 'span' && typeof child.text === 'string') {
          const parts = child.text.split('<Note>');
          
          // If there's text before the <Note>, add it to result
          if (parts[0]) {
            const beforeBlock = {
              ...block,
              _key: generateKey(),
              children: [{
                _type: 'span',
                _key: generateKey(),
                text: parts[0].trim(),
                marks: child.marks || []
              }]
            };
            result.push(beforeBlock);
          }
          
          // Add content after <Note> to noteContent if it exists
          if (parts[1]) {
            noteContent.push({
              _type: 'block',
              _key: generateKey(),
              style: 'normal',
              children: [{
                _type: 'span',
                _key: generateKey(),
                text: parts[1].trim(),
                marks: child.marks || []
              }]
            });
          }
        }
      }
      
      continue;
    }
    
    // Check if this block ends a note
    if (collectingNote && block._type === 'block' && block.children &&
        block.children.some(child => 
          child._type === 'span' && 
          typeof child.text === 'string' && 
          child.text.includes('</Note>'))) {
      
      collectingNote = false;
      
      // Extract text before </Note> and add to noteContent
      for (const child of block.children) {
        if (child._type === 'span' && typeof child.text === 'string') {
          const parts = child.text.split('</Note>');
          
          // Add content before </Note> to noteContent
          if (parts[0]) {
            noteContent.push({
              _type: 'block',
              _key: generateKey(),
              style: 'normal',
              children: [{
                _type: 'span',
                _key: generateKey(),
                text: parts[0].trim(),
                marks: child.marks || []
              }]
            });
          }
          
          // If there's text after the </Note>, add it to result
          if (parts[1]) {
            const afterBlock = {
              ...block,
              _key: generateKey(),
              children: [{
                _type: 'span',
                _key: generateKey(),
                text: parts[1].trim(),
                marks: child.marks || []
              }]
            };
            result.push(afterBlock);
          }
        }
      }
      
      // Create the Note block with all collected content
      result.push({
        _type: 'note',
        _key: generateKey(),
        content: noteContent
      });
      
      continue;
    }
    
    // If we're collecting note content, add this block to note content
    if (collectingNote) {
      // Process any Button tags in the note content
      const processedBlocks = processTextBlockWithTags(block);
      noteContent = noteContent.concat(processedBlocks);
    } else {
      // Regular content - process any Button tags
      const processedBlocks = processTextBlockWithTags(block);
      result.push(...processedBlocks);
    }
  }
  
  return result;
} 
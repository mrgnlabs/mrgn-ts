require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@sanity/client');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

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
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Helper function to convert MDX content to Sanity blocks
function mdxToSanityBlocks(content) {
  // Split content by lines
  const lines = content.split('\n');
  const blocks = [];
  
  let currentBlock = null;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockContent = '';
        codeBlockLanguage = line.slice(3).trim();
      } else {
        // End of code block
        inCodeBlock = false;
        blocks.push({
          _type: 'code',
          _key: generateKey(),
          language: codeBlockLanguage || 'javascript',
          code: codeBlockContent.trim()
        });
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
        blocks.push({
          _type: 'section',
          _key: generateKey(),
          title: title,
          label: `${tagMatch[1]} - ${tagMatch[2]}`
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
 * Special handler for the Use Cases page
 */
async function convertUseCasesPage() {
  try {
    console.log('\nProcessing Use Cases page specifically...');
    
    // Read the MDX file
    const mdxFile = 'src/app/(site)/use-cases/_dep/page.mdx';
    const mdxContent = fs.readFileSync(path.resolve(process.cwd(), mdxFile), 'utf8');
    
    // Parse frontmatter
    const { data, content } = matter(mdxContent);
    
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
    
    // Add horizontal rule
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
    
    // Parse the content to extract use cases
    const lines = content.split('\n');
    let currentUseCase = null;
    let inUseCase = false;
    let description = '';
    let benefit = '';
    
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
        // If we were processing a use case, add it to blocks
        if (inUseCase) {
          blocks.push({
            _type: 'note',
            _key: generateKey(),
            content: [
              {
                _type: 'block',
                _key: generateKey(),
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: generateKey(),
                    text: description
                  }
                ]
              },
              {
                _type: 'block',
                _key: generateKey(),
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: generateKey(),
                    text: benefit
                  }
                ]
              }
            ]
          });
          
          // Reset for next use case
          inUseCase = false;
          description = '';
          benefit = '';
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
        
        // Add section header
        blocks.push({
          _type: 'section',
          _key: generateKey(),
          title: title,
          label: label
        });
      } 
      // Look for bullet points that start a use case
      else if (line.startsWith('- **Description**:')) {
        inUseCase = true;
        description = line.replace('- **Description**:', '').trim();
      }
      // Look for benefit lines
      else if (line.startsWith('- **Benefit**:')) {
        benefit = line.replace('- **Benefit**:', '').trim();
      }
      // Regular bullet points
      else if (line.startsWith('- ')) {
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
      }
      // Regular paragraph
      else {
        blocks.push({
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
    
    // If we were processing a use case at the end, add it
    if (inUseCase) {
      blocks.push({
        _type: 'note',
        _key: generateKey(),
        content: [
          {
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: description
              }
            ]
          },
          {
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: benefit
              }
            ]
          }
        ]
      });
    }
    
    // Check if a document with this slug already exists
    const existingDocs = await client.fetch(`*[_type == "docPage" && slug.current == "use-cases"]`);
    
    if (existingDocs && existingDocs.length > 0) {
      console.log(`Document with slug 'use-cases' already exists, updating...`);
      
      // Update the existing document
      const result = await client.patch(existingDocs[0]._id)
        .set({
          title: 'Use Cases',
          metadata: {
            description: data.description || '',
            keywords: data.keywords || []
          },
          content: blocks
        })
        .commit();
      
      console.log(`Updated document: ${result.title}`);
    } else {
      console.log(`Creating new document for use-cases...`);
      
      // Create a new document
      const doc = {
        _type: 'docPage',
        title: 'Use Cases',
        slug: {
          _type: 'slug',
          current: 'use-cases'
        },
        metadata: {
          description: data.description || '',
          keywords: data.keywords || []
        },
        content: blocks
      };
      
      const result = await client.create(doc);
      console.log(`Created document: ${result.title}`);
    }
    
    console.log('Done processing Use Cases page');
  } catch (error) {
    console.error('Error processing Use Cases page:', error);
  }
}

/**
 * Convert MDX pages to Sanity documents
 */
async function convertMdxToSanity() {
  try {
    // First, handle the Use Cases page specifically
    await convertUseCasesPage();
    
    // Get all MDX files in the _dep directories
    const mdxFiles = glob.sync('src/app/(site)/*/_dep/*.mdx', { cwd: path.resolve(process.cwd()) });
    
    console.log(`Found ${mdxFiles.length} MDX files to convert`);
    
    for (const mdxFile of mdxFiles) {
      // Skip the Use Cases page as we've already handled it
      if (mdxFile.includes('use-cases/_dep/page.mdx')) {
        console.log(`Skipping ${mdxFile} as it's already been processed...`);
        continue;
      }
      
      console.log(`\nProcessing ${mdxFile}...`);
      
      // Read the MDX file
      const mdxContent = fs.readFileSync(path.resolve(process.cwd(), mdxFile), 'utf8');
      
      // Parse frontmatter
      const { data, content } = matter(mdxContent);
      
      // Extract path from file location
      const pathMatch = mdxFile.match(/src\/app\/\(site\)\/([^\/]+)/);
      if (!pathMatch) {
        console.log(`Could not extract path from ${mdxFile}, skipping...`);
        continue;
      }
      
      const pagePath = pathMatch[1];
      console.log(`Page path: ${pagePath}`);
      
      // Convert MDX content to Sanity blocks
      const blocks = mdxToSanityBlocks(content);
      
      // Check if a document with this slug already exists
      const existingDocs = await client.fetch(`*[_type == "docPage" && slug.current == $slug]`, { slug: pagePath });
      
      if (existingDocs && existingDocs.length > 0) {
        console.log(`Document with slug '${pagePath}' already exists, updating...`);
        
        // Update the existing document
        const result = await client.patch(existingDocs[0]._id)
          .set({
            title: data.title || pagePath,
            metadata: {
              description: data.description || '',
              keywords: data.keywords || []
            },
            content: blocks
          })
          .commit();
        
        console.log(`Updated document: ${result.title}`);
      } else {
        console.log(`Creating new document for ${pagePath}...`);
        
        // Create a new document
        const doc = {
          _type: 'docPage',
          title: data.title || pagePath,
          slug: {
            _type: 'slug',
            current: pagePath
          },
          metadata: {
            description: data.description || '',
            keywords: data.keywords || []
          },
          content: blocks
        };
        
        const result = await client.create(doc);
        console.log(`Created document: ${result.title}`);
      }
    }
    
    console.log('\nDone converting MDX pages to Sanity documents');
  } catch (error) {
    console.error('Error converting MDX pages:', error);
  }
}

// Run the function
convertMdxToSanity(); 
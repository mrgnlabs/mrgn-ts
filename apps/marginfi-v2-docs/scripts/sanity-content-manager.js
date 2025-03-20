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
 * Extract and handle imports from MDX file
 * @param {string} content - The MDX content
 * @returns {object} - Object containing cleaned content and import information
 */
function extractImportsFromMdx(content) {
  // Split content by lines
  const lines = content.split('\n');
  const imports = [];
  let contentStartIndex = 0;
  
  // Look for import statements at the top of the file
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('import ')) {
      imports.push(line);
      contentStartIndex = i + 1;
    } else if (line !== '' && !line.startsWith('export const metadata')) {
      // First non-empty, non-import, non-metadata line marks the start of content
      break;
    }
  }
  
  // Extract metadata if it exists
  let metadata = null;
  for (let i = contentStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('export const metadata')) {
      let metadataStartIndex = i;
      let metadataEndIndex = i;
      let braceCount = 0;
      let inMetadata = false;
      
      // Find the end of the metadata object
      for (let j = i; j < lines.length; j++) {
        const metadataLine = lines[j];
        
        // Count braces to find the complete object
        for (let k = 0; k < metadataLine.length; k++) {
          if (metadataLine[k] === '{') {
            braceCount++;
            inMetadata = true;
          } else if (metadataLine[k] === '}') {
            braceCount--;
          }
        }
        
        metadataEndIndex = j;
        
        if (inMetadata && braceCount === 0) {
          break;
        }
      }
      
      // Extract the metadata lines
      const metadataLines = lines.slice(metadataStartIndex, metadataEndIndex + 1);
      metadata = metadataLines.join('\n');
      
      // Skip these lines in the content
      contentStartIndex = metadataEndIndex + 1;
      break;
    }
  }
  
  // Return the cleaned content (without imports and metadata) and the extracted information
  return {
    content: lines.slice(contentStartIndex).join('\n'),
    imports,
    metadata
  };
}

/**
 * Parse image imports to extract image paths
 * @param {Array} imports - Array of import statements
 * @returns {Object} - Mapping of imported names to image paths
 */
function parseImageImports(imports) {
  const imageMap = {};
  
  for (const importStr of imports) {
    // Match patterns like: import ImageName from '~/images/path/to/image.png'
    const imageMatch = importStr.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    
    if (imageMatch && imageMatch[2].includes('/images/')) {
      const imageName = imageMatch[1];
      const imagePath = imageMatch[2].replace('~/images/', '/images/');
      imageMap[imageName] = imagePath;
    }
  }
  
  return imageMap;
}

/**
 * Parse component imports to track which components are available
 * @param {Array} imports - Array of import statements
 * @returns {Object} - Set of available component names
 */
function parseComponentImports(imports) {
  const components = new Set();
  
  for (const importStr of imports) {
    // Match named exports: import { ComponentA, ComponentB } from '~/components/...'
    const namedMatch = importStr.match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"][^'"]+['"]/);
    
    if (namedMatch) {
      const componentNames = namedMatch[1].split(',').map(name => name.trim());
      componentNames.forEach(name => components.add(name));
    }
    
    // Match default imports: import ComponentName from '~/components/...'
    const defaultMatch = importStr.match(/import\s+(\w+)\s+from\s+['"][^'"]+['"]/);
    
    if (defaultMatch && !importStr.includes('/images/')) {
      components.add(defaultMatch[1]);
    }
  }
  
  return components;
}

/**
 * Process property components inside MDX
 * @param {string} content - The content to process
 * @returns {Array} - Array of property objects
 */
function processPropertyComponents(content) {
  const properties = [];
  
  // Match Property components with various formats:
  // 1. Simple format: <Property name="x" type="string">Description</Property>
  // 2. Extended format with nested content: <Property name="x" type="string"><p>Description with <code>markup</code></p></Property>
  const propertiesRegex = /<Property\s+name=["']([^"']*)["']\s+type=["']([^"']*)["']>([\s\S]*?)<\/Property>/g;
  
  let match;
  while ((match = propertiesRegex.exec(content)) !== null) {
    const name = match[1];
    const type = match[2];
    let description = match[3].trim();
    
    // Process description content to handle HTML markup
    // For now, we'll just strip HTML tags for simplicity
    // In a more advanced version, you could convert HTML to Sanity blocks
    description = description
      .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n') // Convert paragraphs to newlines
      .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`') // Convert code to backticks
      .replace(/<\/?[^>]+(>|$)/g, '') // Strip remaining HTML tags
      .trim();
    
    properties.push({
      _type: 'property',
      _key: generateKey(),
      name,
      type,
      description
    });
  }
  
  return properties;
}

/**
 * Process method documentation components inside MDX
 * @param {string} content - The content to process
 * @returns {Object} - Method documentation object
 */
function processMethodDocComponent(content) {
  // Extract method name, parameters, and return type
  const nameMatch = content.match(/<MethodDoc\s+name=["']([^"']*)["']/);
  const paramsMatch = content.match(/parameters=["']([^"']*)["']/);
  const returnsMatch = content.match(/returns=["']([^"']*)["']/);
  
  // Extract description from the content between opening and closing tags
  const descriptionMatch = content.match(/<MethodDoc[^>]*>([\s\S]*?)<\/MethodDoc>/);
  
  return {
    _type: 'method',
    _key: generateKey(),
    name: nameMatch ? nameMatch[1] : '',
    parametersString: paramsMatch ? paramsMatch[1] : '',
    resultType: returnsMatch ? returnsMatch[1] : '',
    description: descriptionMatch ? 
      // Clean up the description content
      descriptionMatch[1]
        .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
        .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim() : ''
  };
}

/**
 * Process parameter list components inside MDX
 * @param {string} content - The content to process
 * @returns {Array} - Array of parameter objects
 */
function processParameterListComponent(content) {
  const parameters = [];
  // Match each Parameter component
  const paramRegex = /<Parameter\s+name=["']([^"']*)["']\s+type=["']([^"']*)["']>([\s\S]*?)<\/Parameter>/g;
  
  let match;
  while ((match = paramRegex.exec(content)) !== null) {
    const name = match[1];
    const type = match[2];
    let description = match[3].trim();
    
    // Clean up description
    description = description
      .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
      .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
    
    parameters.push({
      _type: 'parameter',
      _key: generateKey(),
      name,
      type,
      description
    });
  }
  
  return parameters;
}

/**
 * Convert MDX content to Sanity blocks with proper structure
 * @param {string} content - The MDX content
 * @returns {Array} - The Sanity blocks
 */
function mdxToSanityBlocks(content) {
  // First extract imports and metadata to handle them specially
  const { content: cleanedContent, imports, metadata } = extractImportsFromMdx(content);
  
  // Parse imports to extract images and components
  const imageMap = parseImageImports(imports);
  const availableComponents = parseComponentImports(imports);
  
  console.log('Detected images:', Object.keys(imageMap));
  console.log('Detected components:', Array.from(availableComponents));
  
  // Split content by lines
  const lines = cleanedContent.split('\n');
  const blocks = [];
  
  let currentBlock = null;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLanguage = '';
  let codeBlockTitle = '';
  
  // Note block handling
  let inNoteBlock = false;
  let noteContent = [];
  
  // Table handling
  let inTable = false;
  let tableRows = [];
  let tableHeaders = [];
  
  // Properties handling
  let inPropertiesBlock = false;
  let propertiesContent = '';
  let propertiesTitle = '';
  
  // Property/Parameter list handling
  let inPropertyList = false;
  let propertyItems = [];
  
  // MethodDoc handling
  let inMethodDoc = false;
  let methodDocContent = '';
  
  // ParameterList handling
  let inParameterList = false;
  let parameterListContent = '';
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle Properties components
    if (trimmedLine === '<Properties>' || trimmedLine.startsWith('<Properties ')) {
      inPropertiesBlock = true;
      propertiesContent = '';
      
      // Extract title if available
      const titleMatch = trimmedLine.match(/<Properties\s+title=["']([^"']*)["']/);
      propertiesTitle = titleMatch ? titleMatch[1] : 'Properties';
      
      continue;
    }
    
    if (trimmedLine === '</Properties>') {
      inPropertiesBlock = false;
      
      // Process all Property components inside Properties
      const properties = processPropertyComponents(propertiesContent);
      
      // Only create a propertyList block if we found properties
      if (properties.length > 0) {
        blocks.push({
          _type: 'propertyList',
          _key: generateKey(),
          title: propertiesTitle,
          properties: properties
        });
      } else {
        // If no properties were found but we were in a Properties block,
        // create a minimal propertyList with just the title
        blocks.push({
          _type: 'propertyList',
          _key: generateKey(),
          title: propertiesTitle
        });
      }
      
      continue;
    }
    
    // Collect all content inside Properties tags
    if (inPropertiesBlock) {
      propertiesContent += line + '\n';
      continue;
    }

    // Handle Component tags like <ImageComponent>, <Math>, etc.
    const componentMatch = trimmedLine.match(/<(\w+)([^>]*)>(.*?)<\/\1>/);
    if (componentMatch && availableComponents.has(componentMatch[1])) {
      const componentName = componentMatch[1];
      const componentProps = componentMatch[2];
      const componentContent = componentMatch[3];
      
      if (componentName === 'ImageComponent') {
        // Extract src, width, height, alt from props
        const srcMatch = componentProps.match(/src=\{([^}]+)\}/);
        const widthMatch = componentProps.match(/width=\{(\d+)\}/);
        const heightMatch = componentProps.match(/height=\{(\d+)\}/);
        const altMatch = componentProps.match(/alt=["']([^"']+)["']/);
        
        if (srcMatch && imageMap[srcMatch[1]]) {
          blocks.push({
            _type: 'image',
            _key: generateKey(),
            asset: {
              _type: 'reference',
              _ref: `image-${imageMap[srcMatch[1]]}-sanity` // This is a placeholder, you'll need to handle image references properly
            },
            alt: altMatch ? altMatch[1] : '',
            width: widthMatch ? parseInt(widthMatch[1]) : null,
            height: heightMatch ? parseInt(heightMatch[1]) : null
          });
        }
      } else if (componentName === 'Math') {
        // Handle math component
        blocks.push({
          _type: 'math',
          _key: generateKey(),
          latex: componentContent
        });
      } else {
        // Generic component handling
        blocks.push({
          _type: 'component',
          _key: generateKey(),
          name: componentName,
          props: componentProps.trim(),
          content: componentContent
        });
      }
      
      continue;
    }

    // Check for Note blocks
    if (trimmedLine === '<Note>' || trimmedLine.startsWith('<Note>')) {
      inNoteBlock = true;
      noteContent = [];
      
      // Extract any content after the opening tag
      if (trimmedLine !== '<Note>') {
        const parts = trimmedLine.split('<Note>');
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

    if (trimmedLine === '</Note>' || trimmedLine.endsWith('</Note>')) {
      inNoteBlock = false;
      
      // Extract any content before the closing tag
      if (trimmedLine !== '</Note>') {
        const parts = trimmedLine.split('</Note>');
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
        content: noteContent.length > 0 ? noteContent : [
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
      
      continue;
    }

    if (inNoteBlock) {
      // Process the line for any Button tags or empty <> tags
      if (trimmedLine) {
        let processedLine = trimmedLine;
        
        // Process Button tags
        processedLine = processButtonTags(processedLine);
        
        // Clean up any empty <> tags
        processedLine = processedLine.replace(/<>([^<]*)<\/>/g, '$1');
        
        // Add to note content
        if (processedLine.trim()) {
          const spans = processTextWithMarks(processedLine);
          
          noteContent.push({
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: spans
          });
        }
      }
      continue;
    }
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockContent = '';
        
        // Extract language and title information
        const codeBlockInfo = trimmedLine.slice(3).trim();
        const titleMatch = codeBlockInfo.match(/{{[ ]*title:[ ]*['"](.+?)['"][ ]*}}/);
        
        if (titleMatch) {
          codeBlockTitle = titleMatch[1].trim();
          codeBlockLanguage = codeBlockInfo.replace(titleMatch[0], '').trim();
        } else {
          codeBlockTitle = '';
          codeBlockLanguage = codeBlockInfo;
        }
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
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    // Handle table - detect start of table with | character
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        // Start of table
        inTable = true;
        tableRows = [];
        tableHeaders = [];
        
        // Parse header row
        const headerCells = trimmedLine
          .split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
        
        tableHeaders = headerCells;
      } else if (trimmedLine.startsWith('|') && trimmedLine.includes('-')) {
        // This is the separator row, ignore it
        continue;
      } else {
        // Table data row
        const cells = trimmedLine
          .split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
        
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      // End of table
      inTable = false;
      
      // Create a more robust table object
      const tableBlock = {
        _type: 'table',
        _key: generateKey()
      };
      
      // Add headerRow if we have headers
      if (tableHeaders.length > 0) {
        tableBlock.headerRow = tableHeaders;
      }
      
      // Add rows
      if (tableRows.length > 0) {
        tableBlock.rows = tableRows;
      } else {
        // If no rows, create at least an empty array
        tableBlock.rows = [];
      }
      
      blocks.push(tableBlock);
    }
    
    // Handle MethodDoc components
    if (trimmedLine.startsWith('<MethodDoc ')) {
      inMethodDoc = true;
      methodDocContent = trimmedLine + '\n';
      continue;
    }
    
    if (trimmedLine === '</MethodDoc>') {
      inMethodDoc = false;
      methodDocContent += trimmedLine;
      
      // Process MethodDoc component
      const methodDoc = processMethodDocComponent(methodDocContent);
      
      // Create a method block
      blocks.push({
        _type: 'docTable',
        _key: generateKey(),
        title: 'Method',
        tableType: 'method',
        items: [{
          name: methodDoc.name,
          parametersString: methodDoc.parametersString,
          resultType: methodDoc.resultType,
          description: [{
            _type: 'block',
            _key: generateKey(),
            style: 'normal',
            children: [{
              _type: 'span',
              _key: generateKey(),
              text: methodDoc.description
            }]
          }]
        }]
      });
      
      continue;
    }
    
    if (inMethodDoc) {
      methodDocContent += line + '\n';
      continue;
    }
    
    // Handle ParameterList components
    if (trimmedLine === '<ParameterList>' || trimmedLine.startsWith('<ParameterList ')) {
      inParameterList = true;
      parameterListContent = '';
      
      // Extract title if available
      const titleMatch = trimmedLine.match(/<ParameterList\s+title=["']([^"']*)["']/);
      const parameterListTitle = titleMatch ? titleMatch[1] : 'Parameters';
      
      continue;
    }
    
    if (trimmedLine === '</ParameterList>') {
      inParameterList = false;
      
      // Process ParameterList component
      const parameters = processParameterListComponent(parameterListContent);
      
      // Create a parameterList block only if we have parameters
      if (parameters.length > 0) {
        blocks.push({
          _type: 'parameterList',
          _key: generateKey(),
          title: parameterListTitle,
          parameters: parameters
        });
      } else {
        // If no parameters were found but we were in a ParameterList block,
        // create a minimal parameterList with just the title
        blocks.push({
          _type: 'parameterList',
          _key: generateKey(),
          title: parameterListTitle
        });
      }
      
      continue;
    }
    
    if (inParameterList) {
      parameterListContent += line + '\n';
      continue;
    }
    
    // Handle regular content lines
    if (trimmedLine) {
      // Process line for Button tags and <> tags
      let processedLine = processButtonTags(trimmedLine);
      
      // Clean up any empty <> tags
      processedLine = processedLine.replace(/<>([^<]*)<\/>/g, '$1');
      
      // Create spans with proper marks
      const spans = processTextWithMarks(processedLine);
      
      // Handle different line types (headings, lists, etc.)
      if (trimmedLine.startsWith('# ')) {
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'h1',
          children: spans
        });
      } else if (trimmedLine.startsWith('## ')) {
        // Check for tags and labels in h2
        const h2Content = trimmedLine.slice(3).trim();
        const tagMatch = h2Content.match(/{{[ ]*tag:[ ]*['"](.+?)['"][ ]*,[ ]*label:[ ]*['"](.+?)['"][ ]*}}/);
        const anchorMatch = h2Content.match(/{{[ ]*anchor:[ ]*['"]?(.+?)['"]?[ ]*}}/);
        
        if (tagMatch) {
          const title = h2Content.replace(tagMatch[0], '').trim();
          // Create a section block with a proper content array
          blocks.push({
            _type: 'section',
            _key: generateKey(),
            title: title,
            tag: tagMatch[1],
            label: tagMatch[2],
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
            ],
            anchor: anchorMatch[1]
          });
        } else {
          blocks.push({
            _type: 'block',
            _key: generateKey(),
            style: 'h2',
            children: spans
          });
        }
      } else if (trimmedLine.startsWith('### ')) {
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'h3',
          children: spans
        });
      } else if (trimmedLine.startsWith('- ')) {
        // Handle list items
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          listItem: 'bullet',
          children: spans
        });
      } else if (trimmedLine.startsWith('1. ')) {
        // Handle numbered list items
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'normal',
          listItem: 'number',
          children: spans
        });
      } else if (trimmedLine.startsWith('> ')) {
        // Handle blockquotes
        blocks.push({
          _type: 'block',
          _key: generateKey(),
          style: 'blockquote',
          children: spans
        });
      } else if (trimmedLine === '---') {
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
      } else if (trimmedLine === '') {
        // Skip empty lines
        continue;
      } else {
        // Handle regular paragraphs
        // Check for lead text
        const leadMatch = trimmedLine.match(/{{[ ]*className:[ ]*['"]lead['"][ ]*}}/);
        if (leadMatch) {
          blocks.push({
            _type: 'block',
            _key: generateKey(),
            style: 'lead',
            children: [
              {
                _type: 'span',
                _key: generateKey(),
                text: trimmedLine.replace(leadMatch[0], '').trim()
              }
            ]
          });
        } else {
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
  
  // Handle any table that might be at the end of the content
  if (inTable) {
    blocks.push({
      _type: 'table',
      _key: generateKey(),
      headers: tableHeaders,
      rows: tableRows
    });
  }
  
  return blocks;
}

/**
 * Process button tags in text
 * @param {string} text - The text to process
 * @returns {string} - Processed text with button markers
 */
function processButtonTags(text) {
  if (!text.includes('<Button')) {
    return text;
  }
  
  let processedText = text;
  // Process Button tags
  const buttonRegex = /<Button\s+href="([^"]+)"(?:\s+variant="([^"]+)")?>(.*?)<\/Button>/g;
  let result;
  
  if (buttonRegex.test(processedText)) {
    let lastIndex = 0;
    let processedParts = [];
    buttonRegex.lastIndex = 0; // Reset regex state
    
    while ((result = buttonRegex.exec(processedText)) !== null) {
      // Add text before the button
      if (result.index > lastIndex) {
        processedParts.push(processedText.substring(lastIndex, result.index));
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
    if (lastIndex < processedText.length) {
      processedParts.push(processedText.substring(lastIndex));
    }
    
    processedText = processedParts.join('');
  }
  
  return processedText;
}

/**
 * Process text content to create spans with proper marks
 * @param {string} text - Text to process
 * @returns {Array} - Array of span objects with appropriate marks
 */
function processTextWithMarks(text) {
  const spans = [];
  
  // Check for link markers and convert them to spans with link marks
  if (text.includes('__LINK[')) {
    const linkRegex = /__LINK\[([^|]+)\|([^|]+)\|([^\]]+)\]__/g;
    let lastLinkIndex = 0;
    let linkResult;
    
    while ((linkResult = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (linkResult.index > lastLinkIndex) {
        const beforeText = text.substring(lastLinkIndex, linkResult.index);
        spans.push(...processTextFormats(beforeText));
      }
      
      // Create link span
      const href = linkResult[1];
      const variant = linkResult[2];
      const linkText = linkResult[3];
      
      spans.push({
        _type: 'span',
        _key: generateKey(),
        text: linkText,
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
    if (lastLinkIndex < text.length) {
      const remainingText = text.substring(lastLinkIndex);
      spans.push(...processTextFormats(remainingText));
    }
  } else {
    // No links, just process text formats
    spans.push(...processTextFormats(text));
  }
  
  return spans;
}

/**
 * Process text formatting like bold, italic, code, etc.
 * @param {string} text - The text to process
 * @returns {Array} - Array of span objects with appropriate marks
 */
function processTextFormats(text) {
  const spans = [];
  
  // Process all formats: bold, italic, code, etc.
  
  // Bold: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  // Italic: *text*
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
  // Code: `text`
  const codeRegex = /`([^`]+)`/g;
  
  // Check if the text has any formatting
  if (boldRegex.test(text) || italicRegex.test(text) || codeRegex.test(text)) {
    // Reset regex state
    boldRegex.lastIndex = 0;
    italicRegex.lastIndex = 0;
    codeRegex.lastIndex = 0;
    
    // This is a simplified approach - for production, you'd want a more robust parser
    // For now, we'll just handle bold text as an example
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
  } else {
    // No formatting, just add the text as is
    spans.push({
      _type: 'span',
      _key: generateKey(),
      text: text
    });
  }
  
  return spans;
}

/**
 * Convert MDX files to Sanity documents
 */
async function convertMdxToSanity() {
  try {
    // Get all MDX files - adjust the path to match where your MDX files are located
    const mdxFiles = glob.sync('src/app/(site)/**/*.mdx');
    
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
      // Convert path like "src/app/(site)/the-arena/page.mdx" to "the-arena"
      const parts = normalizedPath.split('/');
      const siteIndex = parts.indexOf('(site)');
      
      if (siteIndex === -1 || siteIndex + 1 >= parts.length) {
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
      
      const slug = parts[siteIndex + 1];
      
      // Convert MDX content to Sanity blocks
      const sanityBlocks = mdxToSanityBlocks(content);
      
      // Create a new document object
      const newDoc = {
        _type: 'docPage',
        title: data.title || slug,
        slug: { current: slug },
        content: sanityBlocks
      };
      
      // Save the document to Sanity
      const result = await client.create(newDoc);
      
      console.log(`✓ Saved document: ${result.title}`);
    }
  } catch (error) {
    console.error('\n❌ Error processing documents:', error);
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

function removeProblematicBlock(docId, blockKey) {
  // Implementation of removeProblematicBlock function
}

function fixExistingDocumentsTags() {
  // Implementation of fixExistingDocumentsTags function
}

'use client'

import React from 'react'
import Link from 'next/link'
import { PortableTextComponents, PortableText, PortableTextMarkComponentProps } from '@portabletext/react'
import * as mdx from '~/components-v2/mdx'
import { Math as MathComponent } from '~/components-v2/Math'
import { ImageComponent } from '~/components-v2/ImageComponent'
import { DocTable } from '~/components-v2/DocTable'
import { 
  NoteBlock, 
  MathBlock, 
  ImageWithCaption, 
  CodeBlock, 
  DocTableBlock, 
  Method as SanityMethod,
  ContentBlock,
  Section,
  PropertyList,
  ParameterList,
  Table
} from './SanitySchemaTypes'
import { Button } from '~/components-v2/Button'
import { Note } from '~/components-v2/mdx'

/**
 * Helper function to generate a unique ID for headings
 */
function generateId(prefix: string): string {
  // Use a simpler approach that works on both client and server
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper function to extract text from children array
 */
function extractTextFromChildren(children: any[]): string {
  if (!children || !Array.isArray(children)) return '';
  return children.map(child => child.text || '').join('');
}

/**
 * Helper to extract HTML-like tags and replace them with actual components
 */
const processMarkdownTags = (content: string) => {
  // Process Button tags
  const buttonRegex = /<Button[^>]*href="([^"]*)"[^>]*><>([^<]*)<\/><\/Button>/g;
  content = content.replace(buttonRegex, (_, href, text) => {
    return `__BUTTON_COMPONENT_START__${href}__BUTTON_TEXT__${text}__BUTTON_COMPONENT_END__`;
  });

  // Process simpler Button tags
  const simpleButtonRegex = /<Button[^>]*href="([^"]*)"[^>]*>([^<]*)<\/Button>/g;
  content = content.replace(simpleButtonRegex, (_, href, text) => {
    return `__BUTTON_COMPONENT_START__${href}__BUTTON_TEXT__${text}__BUTTON_COMPONENT_END__`;
  });

  // Process Note tags
  const noteStartRegex = /<Note>/g;
  const noteEndRegex = /<\/Note>/g;
  content = content.replace(noteStartRegex, '__NOTE_COMPONENT_START__');
  content = content.replace(noteEndRegex, '__NOTE_COMPONENT_END__');

  // Process empty tags
  const emptyTagsRegex = /<>([^<]*)<\/>/g;
  content = content.replace(emptyTagsRegex, '$1');

  return content;
};

// Handler for rendering components from placeholders
const renderProcessedContent = (content: string) => {
  if (!content) return null;

  const parts = [];
  let currentIndex = 0;
  
  // Handle buttons
  const buttonRegex = /__BUTTON_COMPONENT_START__([^_]*)__BUTTON_TEXT__([^_]*)__BUTTON_COMPONENT_END__/g;
  let match;
  
  while ((match = buttonRegex.exec(content)) !== null) {
    // Add text before the component
    if (match.index > currentIndex) {
      parts.push(content.substring(currentIndex, match.index));
    }
    
    // Add the button component
    const href = match[1];
    const text = match[2];
    parts.push(
      <Button key={`button-${parts.length}`} href={href} variant="text">
        {text}
      </Button>
    );
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining content
  if (currentIndex < content.length) {
    parts.push(content.substring(currentIndex));
  }
  
  // Process notes
  return parts.map((part, index) => {
    if (typeof part !== 'string') {
      return part;
    }
    
    // Handle Note components
    if (part.includes('__NOTE_COMPONENT_START__')) {
      const noteContent = part.split('__NOTE_COMPONENT_START__')[1].split('__NOTE_COMPONENT_END__')[0];
      return <Note key={`note-${index}`}>{noteContent}</Note>;
    }
    
    return part;
  });
};

/**
 * PortableText components for rendering Sanity content
 * 
 * These components map Sanity block types to MDX components
 * for consistent styling with the rest of the site.
 */
export const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{children}</h1>,
    h2: ({ children }) => {
      const id = generateId('section');
      return <mdx.h2 id={id}>{children}</mdx.h2>;
    },
    h3: ({ children }) => {
      const id = generateId('subsection');
      return <mdx.h3 id={id}>{children}</mdx.h3>;
    },
    h4: ({ children }) => <h4 className="font-semibold text-lg mt-6 mb-3">{children}</h4>,
    h5: ({ children }) => <h5 className="font-semibold text-base mt-6 mb-2">{children}</h5>,
    h6: ({ children }) => <h6 className="font-semibold text-sm mt-4 mb-2">{children}</h6>,
    normal: ({ children }) => {
      // If it's a string, process any HTML-like tags
      if (typeof children === 'string') {
        const processedText = processMarkdownTags(children);
        const renderedContent = renderProcessedContent(processedText);
        
        return <p className="mt-6">{renderedContent}</p>;
      }
      
      // If it's not a simple string (e.g., it contains React elements)
      return <p className="mt-6">{children}</p>;
    },
    lead: ({ children }) => <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-6 mb-6">{children}</p>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-zinc-200 dark:border-zinc-700 pl-4 italic my-6">{children}</blockquote>,
  },
  types: {
    section: ({ value }: { value: Section }) => {
      let title = value.title || '';
      let tag = '';
      let label = '';

      // Extract tag and label if present in the title
      const tagLabelMatch = title.match(/(.+?)\s*{{\s*tag:\s*['"]([^'"]*)['"]\s*,\s*label:\s*['"]([^'"]*)['"]\s*}}/);
      
      if (tagLabelMatch) {
        title = tagLabelMatch[1].trim();
        tag = tagLabelMatch[2];
        label = tagLabelMatch[3];
      }

      const id = generateId('section');
      
      return (
        <div className="my-16" id={id}>
          <mdx.h2 id={id}>{title}</mdx.h2>
          {value.content && (
            <PortableText value={value.content} components={components} />
          )}
        </div>
      );
    },
    propertyList: ({ value }: { value: any }) => {
      console.log("PropertyList value:", JSON.stringify(value, null, 2));
      
      // Extract title from _key if possible
      let title = 'Properties';
      
      if (value && value._key) {
        // Try to extract a meaningful section name from the key
        const keyParts = value._key.split('w');
        if (keyParts.length > 1) {
          // Look for common property sections
          const commonSections = {
            'btuf': 'Properties',
            'w0m1': 'Bank Properties',
            'e40s': 'MarginfiClient Properties',
            '4cxx': 'Account Properties',
            '870r': 'Config Properties',
            '9b7z': 'User Properties',
            'kby3': 'Group Properties',
            'mndn': 'Wallet Properties'
          };
          
          // Find a matching key part
          for (const [keyPart, sectionName] of Object.entries(commonSections)) {
            if (value._key.includes(keyPart)) {
              title = sectionName;
              break;
            }
          }
        }
      }
      
      // If it's just a basic propertyList without properties array
      if (!value || !value.properties || !Array.isArray(value.properties)) {
        return (
          <div className="my-8 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-medium">
              {value && value.title ? value.title : title}
            </div>
            <div className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
              {/* Example properties based on section */}
              {title === 'Bank Properties' && (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <div className="py-3">
                    <div className="flex items-baseline mb-1">
                      <code className="font-mono text-sm font-semibold">mint</code>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">PublicKey</span>
                    </div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      The token mint address for this bank
                    </div>
                  </div>
                  <div className="py-3">
                    <div className="flex items-baseline mb-1">
                      <code className="font-mono text-sm font-semibold">config</code>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">BankConfig</span>
                    </div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      Bank configuration parameters
                    </div>
                  </div>
                </div>
              )}
              
              {title !== 'Bank Properties' && (
                <div>
                  View documentation for property details
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Regular rendering with properties
      return (
        <div className="my-8 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-medium">
            {value.title || title}
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {value.properties && Array.isArray(value.properties) && value.properties.map((property: any, index: number) => (
              <div key={property._key || index} className="px-4 py-3">
                <div className="flex items-baseline mb-1">
                  <code className="font-mono text-sm font-semibold">{property.name}</code>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">{property.type}</span>
                </div>
                {property.description && (
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {property.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    },
    parameterList: ({ value }: { value: any }) => {
      console.log("ParameterList value:", value);
      
      if (!value || !value.parameters || !Array.isArray(value.parameters)) {
        if (value && value.title) {
          return (
            <div className="my-8 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-medium">
                {value.title || 'Parameters'}
              </div>
              <div className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                No parameters data available
              </div>
            </div>
          );
        }
        return null;
      }
      
      return (
        <div className="my-8 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-medium">
            {value.title || 'Parameters'}
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {value.parameters.map((parameter: any, index: number) => (
              <div key={parameter._key || index} className="px-4 py-3">
                <div className="flex items-baseline mb-1">
                  <code className="font-mono text-sm font-semibold">{parameter.name}</code>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">{parameter.type}</span>
                </div>
                {parameter.description && (
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {parameter.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    },
    table: ({ value }: { value: any }) => {
      console.log("Table value:", JSON.stringify(value, null, 2));
      
      if (!value) {
        return null;
      }
      
      // Extract meaningful data from _key if possible
      let title = 'Methods';
      let tableType = 'method';
      
      if (value && value._key) {
        // Try to match key to common method tables
        const keyParts = value._key.split('w');
        if (keyParts.length > 1) {
          const commonTables = {
            'wgy5': 'Bank Methods',
            '0gr0': 'MarginfiClient Methods',
            'ks7u': 'Account Methods',
            'u77r': 'Utility Methods'
          };
          
          // Find a matching key part
          for (const [keyPart, tableName] of Object.entries(commonTables)) {
            if (value._key.includes(keyPart)) {
              title = tableName;
              break;
            }
          }
        }
      }
      
      // Handle missing or malformed data
      if (!value.rows || !Array.isArray(value.rows)) {
        // Provide sample data based on the table type
        if (title === 'Bank Methods') {
          return (
            <div className="my-8 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <thead className="bg-zinc-100 dark:bg-zinc-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Method Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Parameters</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Return Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <code className="font-mono">getAssetPrice</code>
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      none
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <code className="font-mono">Promise&lt;number&gt;</code>
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      Gets the current price for the bank's asset
                    </td>
                  </tr>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <code className="font-mono">deposit</code>
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      account, amount
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <code className="font-mono">Promise&lt;Transaction&gt;</code>
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      Creates a transaction to deposit funds
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }
        
        // Generic table with title
        return (
          <div className="my-8 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Parameters</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Return Type</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300" colSpan={4}>
                    See SDK documentation for method details
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      }
      
      // Regular rendering with data
      return (
        <div className="my-8 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            {value.headerRow && Array.isArray(value.headerRow) && (
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  {value.headerRow.map((cell: string, index: number) => (
                    <th 
                      key={index}
                      className="px-4 py-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {value.rows.map((row: string[], rowIndex: number) => (
                <tr 
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800/50'}
                >
                  {row.map((cell: string, cellIndex: number) => (
                    <td 
                      key={cellIndex}
                      className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
    contentBlock: ({ value }: { value: any }) => {
      // First, check if the content is in correct format
      if (!value || !value.content) {
        console.warn("Invalid content block:", value);
        return null;
      }
      
      // Check if content contains a Note tag
      const hasNoteTag = Array.isArray(value.content) && 
        value.content.some((block: any) => 
          (block.children && Array.isArray(block.children) && 
           block.children.some((child: any) => 
             typeof child.text === 'string' && child.text.includes('<Note>')
           )
          )
        );
      
      // If it contains a Note, we need special handling
      if (hasNoteTag) {
        console.log("Found Note in content block:", value);
        
        // Extract note content - this is a simplification
        const noteContent = value.content.map((block: any) => {
          if (block.children && Array.isArray(block.children)) {
            return block.children.map((child: any) => {
              if (typeof child.text === 'string') {
                // Remove the Note tags
                return child.text
                  .replace(/<Note>/g, '')
                  .replace(/<\/Note>/g, '');
              }
              return child.text || '';
            }).join('');
          }
          return '';
        }).join('');
        
        // Render a proper note
        return (
          <div className="my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 leading-6 text-emerald-900 dark:border-green-500/30 dark:bg-green-500/5 dark:text-green-200">
            <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 flex-none fill-emerald-500 stroke-white dark:fill-green-500/20 dark:stroke-green-500" aria-hidden="true">
              <circle cx="8" cy="8" r="8" strokeWidth="0" />
              <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.75 7.75h1.5v3.5" />
              <circle cx="8" cy="4" r=".5" fill="none" />
            </svg>
            <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
              {noteContent}
            </div>
          </div>
        );
      }
      
      // Regular content block
      const blockId = value.title ? value.title.toLowerCase().replace(/\s+/g, '-') : generateId('block');
      
      return (
        <div id={blockId} className="my-8">
          {value.title && <mdx.h3 id={blockId}>{value.title}</mdx.h3>}
          {value.label && <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>}
          {value.content && <PortableText value={value.content} components={components} />}
        </div>
      );
    },
    note: ({ value }: { value: any }) => {
      // Extract the content from the note value
      if (!value || !value.content) {
        return null;
      }
      
      // Apply special handling for buttons inside notes
      let processedContent = value.content;
      
      // Log note content for debugging
      console.log('Note content:', value.content);
      
      return (
        <Note>
          <PortableText 
            value={processedContent} 
            components={portableTextComponents} 
          />
        </Note>
      );
    },
    math: ({ value }: { value: MathBlock }) => (
      <MathComponent display={true}>{value.formula}</MathComponent>
    ),
    mathBlock: ({ value }: { value: MathBlock }) => (
      <MathComponent display={true}>{value.formula}</MathComponent>
    ),
    image: ({ value }: { value: ImageWithCaption }) => {
      // Get the image URL from Sanity
      const imageUrl = value.asset?._ref ? 
        `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${value.asset._ref.replace('image-', '').replace('-jpg', '.jpg').replace('-png', '.png').replace('-webp', '.webp')}` : 
        '';
      
      return (
        <figure className="my-6">
          <img 
            src={imageUrl} 
            alt={value.alt || ''} 
            className="rounded-lg border border-zinc-200 dark:border-zinc-800"
          />
          {value.caption && (
            <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    code: ({ value }: { value: any }) => {
      if (!value || !value.code) {
        return null;
      }
      
      // Extract the base language without any metadata
      let language = value.language || 'typescript';
      if (language && language.includes('{{')) {
        language = language.split('{{')[0].trim();
      }
      
      // Using basic pre/code elements with custom styling
      return (
        <div className="my-6">
          {value.filename && (
            <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-zinc-700/50 bg-zinc-800 px-4 py-2 text-sm text-white">
              <span>{value.filename}</span>
            </div>
          )}
          <pre className={`rounded${value.filename ? '-b' : ''}-xl bg-zinc-950 px-4 py-3`}>
            <code className={language ? `language-${language}` : ''}>
              {value.code}
            </code>
          </pre>
        </div>
      );
    },
    docTable: ({ value }: { value: DocTableBlock }) => {
      return (
        <DocTable 
          title={value.title} 
          items={value.items} 
          columns={[
            { header: 'Method Name', key: 'name', isCode: true },
            { header: 'Parameters', key: 'parametersString', width: '1fr' },
            { header: 'Result Type(s)', key: 'resultType', isCode: true },
            { header: 'Description', key: 'description', width: '1fr' }
          ]}
        />
      );
    },
    properties: ({ value }: { value: any }) => {
      return (
        <div className="my-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-medium">
            {value.title || 'Properties'}
          </div>
          <div className="px-4 py-2">
            {value.items && value.items.map((item: any, index: number) => (
              <div key={item._key || index} className="py-2 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      );
    },
    method: ({ value }: { value: any }) => {
      // Check if it's a detailed format or simple list format
      if (value.format === 'detailed') {
        // Detailed format with parameters
        return (
          <div>
            {value.title && <mdx.h2 id={value.title.toLowerCase().replace(/\s+/g, '-')}>{value.title}</mdx.h2>}
            {value.items && value.items.map((item: any, index: number) => (
              <div key={item._key || index} className="my-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-medium">
                  <code className="font-mono">{item.name}</code>
                  {item.parametersString && <span className="text-zinc-500 ml-2">{item.parametersString}</span>}
                  {item.resultType && <span className="text-zinc-500 ml-2">→ <code className="font-mono">{item.resultType}</code></span>}
                </div>
                <div className="px-4 py-2">
                  {item.description && <PortableText value={item.description} components={components} />}
                  
                  {item.parameters && item.parameters.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Parameters</h4>
                      <div className="space-y-3">
                        {item.parameters.map((param: any, paramIndex: number) => (
                          <div key={param._key || paramIndex} className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-baseline">
                              <code className="font-mono text-sm">{param.name}</code>
                              {param.type && <span className="text-xs text-zinc-500 ml-2">{param.type}</span>}
                              {param.optional && <span className="text-xs text-zinc-500 ml-1">(optional)</span>}
                            </div>
                            {param.description && <div className="mt-1 text-sm">
                              {typeof param.description === 'string' 
                                ? <p>{param.description}</p>
                                : <PortableText value={param.description} components={components} />
                              }
                            </div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
      
      // Simple list format
      return (
        <div className="my-6">
          {value.title && <h3 className="text-lg font-medium mb-3">{value.title}</h3>}
          <div className="space-y-3">
            {value.items && value.items.map((item: any, index: number) => (
              <div key={item._key || index} className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                <div className="flex items-baseline">
                  <code className="font-mono">{item.name}</code>
                  {item.parametersString && <span className="text-sm text-zinc-500 ml-2">{item.parametersString}</span>}
                </div>
                {item.description && (
                  <div className="mt-1">
                    {typeof item.description === 'string' 
                      ? <p>{item.description}</p>
                      : <PortableText value={item.description} components={components} />
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    },
    block: ({ value }: { value: any }) => {
      // If it's a block with children, render based on style
      if (value.children && Array.isArray(value.children)) {
        // Extract text from children and clean it up
        const originalText = extractTextFromChildren(value.children);
        
        // Clean text by removing HTML-like tags (this is a simple approach and might need enhancement)
        let text = originalText;
        
        // Remove Button tags and similar custom component tags
        text = text.replace(/<Button[^>]*>(.*?)<\/Button>/g, '$1');
        text = text.replace(/<Note>(.*?)<\/Note>/g, '$1');
        
        // Handle special cases of component-like syntax in text
        if (text.includes('<Button')) {
          console.log('Found Button in text:', text);
          
          // Try to extract the href and content
          const hrefMatch = text.match(/href="([^"]*)"/);
          const href = hrefMatch ? hrefMatch[1] : '#';
          
          // Extract content between Button tags or use placeholder
          const contentMatch = text.match(/<Button[^>]*>(.*?)<\/Button>/);
          const content = contentMatch ? contentMatch[1] : text;
          
          // Render a proper button
          return (
            <a 
              href={href}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 active:bg-zinc-800 active:text-white/80"
            >
              {content}
            </a>
          );
        }
        
        // Handle Note component in text
        if (text.includes('<Note>')) {
          console.log('Found Note in text:', text);
          
          // Extract content between Note tags
          const contentMatch = text.match(/<Note>(.*?)<\/Note>/);
          const content = contentMatch ? contentMatch[1] : text;
          
          // Render a proper note
          return (
            <div className="my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 leading-6 text-emerald-900 dark:border-green-500/30 dark:bg-green-500/5 dark:text-green-200">
              <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 flex-none fill-emerald-500 stroke-white dark:fill-green-500/20 dark:stroke-green-500" aria-hidden="true">
                <circle cx="8" cy="8" r="8" strokeWidth="0" />
                <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.75 7.75h1.5v3.5" />
                <circle cx="8" cy="4" r=".5" fill="none" />
              </svg>
              <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
                {content}
              </div>
            </div>
          );
        }
        
        // Regular rendering based on style
        switch (value.style) {
          case 'h1':
            return <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{text}</h1>;
          case 'h2':
            const id = generateId('section');
            return <mdx.h2 id={id}>{text}</mdx.h2>;
          case 'h3':
            const subId = generateId('subsection');
            return <mdx.h3 id={subId}>{text}</mdx.h3>;
          case 'h4':
            return <h4 className="font-semibold text-lg mt-6 mb-3">{text}</h4>;
          case 'h5':
            return <h5 className="font-semibold text-base mt-6 mb-2">{text}</h5>;
          case 'h6':
            return <h6 className="font-semibold text-sm mt-4 mb-2">{text}</h6>;
          case 'blockquote':
            return <blockquote className="border-l-4 border-zinc-200 dark:border-zinc-700 pl-4 italic my-6">{text}</blockquote>;
          case 'lead':
            return <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-6 mb-6">{text}</p>;
          case 'normal':
          default:
            return <p className="mt-6">{text}</p>;
        }
      }

      // Fallback for unknown block types
      console.warn('Unknown block structure:', value);
      return (
        <pre className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    },
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{children}</code>,
    mathInline: ({ children }) => <MathComponent>{String(children)}</MathComponent>,
    link: ({ children, value }: PortableTextMarkComponentProps) => {
      const href = value?.href || '';
      const isButton = value?.isButton || false;
      const variant = value?.variant || 'text';
      
      // If it's flagged as a button, render it using the Button component
      if (isButton) {
        return (
          <Button href={href} variant={variant as any}>
            {children}
          </Button>
        );
      }
      
      // Otherwise, render as a regular link
      return (
        <Link href={href} className="text-blue-500 hover:text-blue-700">
          {children}
        </Link>
      );
    },
    internalLink: ({ value, children }) => {
      return (
        <a href={`/${value?.slug?.current || ''}`} className="text-blue-600 dark:text-blue-400 hover:underline">
          {children}
        </a>
      );
    },
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-6 mt-6 space-y-2">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-6 mt-6 space-y-2">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
};

// Export the components for use in other files
export const portableTextComponents = components;

export default components; 
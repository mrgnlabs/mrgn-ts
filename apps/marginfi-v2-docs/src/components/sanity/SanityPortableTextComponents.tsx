'use client'

import React from 'react'
import { PortableTextComponents, PortableText } from '@portabletext/react'
import * as mdx from '~/components/mdx'
import { Math as MathComponent } from '~/components/Math'
import { ImageComponent } from '~/components/ImageComponent'
import { DocTable } from '~/components/DocTable'
import { 
  NoteBlock, 
  MathBlock, 
  ImageWithCaption, 
  CodeBlock, 
  DocTableBlock, 
  Method as SanityMethod,
  ContentBlock,
  Section
} from './SanitySchemaTypes'

/**
 * Helper function to generate a unique ID for headings
 */
function generateId(prefix: string): string {
  // Use a simpler approach that works on both client and server
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Helper function to extract text from children array
 */
function extractTextFromChildren(children: any[]): string {
  if (!children || !Array.isArray(children)) return '';
  return children.map(child => child.text || '').join('');
}

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
      // Clean up HTML-like tags if it's a string
      if (typeof children === 'string') {
        const cleanText = children
          .replace(/<Button[^>]*href="([^"]*)"[^>]*><>([^<]*)<\/><\/Button>/g, '$2')
          .replace(/<Button[^>]*>([^<]*)<\/Button>/g, '$1')
          .replace(/<>([^<]*)<\/>/g, '$1')
          .replace(/<Note>/g, '')
          .replace(/<\/Note>/g, '');
        
        return <p className="mt-6">{cleanText}</p>;
      }
      
      // If it's not a simple string (e.g., it contains React elements)
      return <p className="mt-6">{children}</p>;
    },
    lead: ({ children }) => <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-6 mb-6">{children}</p>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-zinc-200 dark:border-zinc-700 pl-4 italic my-6">{children}</blockquote>,
  },
  types: {
    section: ({ value }: { value: Section }) => {
      // Extract the title, removing any tag/label info if present
      let title = value.title || '';
      let tag = '';
      let label = '';
      
      // Parse title if it contains tag/label info in the format "Title {{ tag: 'x', label: 'y' }}"
      if (title.includes('{{')) {
        const titleParts = title.split('{{');
        title = titleParts[0].trim();
        
        // Try to extract tag and label from the second part
        const tagLabelPart = titleParts[1].replace('}}', '').trim();
        const tagMatch = tagLabelPart.match(/tag:\s*['"]([^'"]*)['"]/);
        const labelMatch = tagLabelPart.match(/label:\s*['"]([^'"]*)['"]/);
        
        if (tagMatch && tagMatch[1]) tag = tagMatch[1];
        if (labelMatch && labelMatch[1]) label = labelMatch[1];
      }
      
      const sectionId = title ? title.toLowerCase().replace(/\s+/g, '-') : generateId('section');
      
      return (
        <div id={sectionId} className="my-12">
          {title && <mdx.h2 id={sectionId}>{title}</mdx.h2>}
          {(label || value.label) && <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{label || value.label}</p>}
          {value.content && <PortableText value={value.content} components={components} />}
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
    note: ({ value }: { value: NoteBlock }) => {
      return (
        <div className="my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 leading-6 text-emerald-900 dark:border-green-500/30 dark:bg-green-500/5 dark:text-green-200">
          <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 flex-none fill-emerald-500 stroke-white dark:fill-green-500/20 dark:stroke-green-500" aria-hidden="true">
            <circle cx="8" cy="8" r="8" strokeWidth="0" />
            <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.75 7.75h1.5v3.5" />
            <circle cx="8" cy="4" r=".5" fill="none" />
          </svg>
          <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
            {value.content ? <PortableText value={value.content} components={components} /> : null}
          </div>
        </div>
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
    code: ({ value }: { value: CodeBlock }) => {
      console.log("Rendering code block via PortableText:", value);
      
      // Check if value.code exists before rendering
      if (!value || !value.code) {
        console.warn("Code block is missing code property:", value);
        return (
          <div className="my-6 p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">Error: Code block is missing content</p>
          </div>
        );
      }
      
      // Extract just the language part, remove any title or other metadata
      let language = value.language;
      if (language && language.includes("{{")) {
        language = language.split("{{")[0].trim();
      }
      
      // Use basic pre/code elements instead of the more complex CodeGroup component
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
    link: ({ value, children }) => {
      const href = value?.href || '#';
      const rel = !href.startsWith('/') ? 'noreferrer noopener' : undefined;
      const target = href.startsWith('http') ? '_blank' : undefined;
      
      // Check various ways a button might be indicated
      const isButton = 
        value?.isButton === true || 
        value?.variant === 'button' ||
        href.includes('npmjs.com') ||
        href.includes('github.com');
      
      if (isButton) {
        return (
          <a 
            href={href} 
            rel={rel}
            target={target}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 active:bg-zinc-800 active:text-white/80"
          >
            {children}
          </a>
        );
      }
      
      // Regular link
      return (
        <a 
          href={href} 
          rel={rel} 
          target={target}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {children}
        </a>
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
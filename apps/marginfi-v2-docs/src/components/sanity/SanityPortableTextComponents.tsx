'use client'

import React from 'react'
import { PortableTextComponents, PortableText } from '@portabletext/react'
import * as mdx from '~/components/mdx'
import { Math } from '~/components/Math'
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
 * PortableText components for rendering Sanity content
 * 
 * These components map Sanity block types to MDX components
 * for consistent styling with the rest of the site.
 */
export const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{children}</h1>,
    h2: ({ children }) => {
      const id = 'section-' + Date.now().toString(36);
      return <mdx.h2 id={id}>{children}</mdx.h2>;
    },
    h3: ({ children }) => {
      const id = 'subsection-' + Date.now().toString(36);
      return <mdx.h3 id={id}>{children}</mdx.h3>;
    },
    h4: ({ children }) => <h4 className="font-semibold text-lg mt-6 mb-3">{children}</h4>,
    h5: ({ children }) => <h5 className="font-semibold text-base mt-6 mb-2">{children}</h5>,
    h6: ({ children }) => <h6 className="font-semibold text-sm mt-4 mb-2">{children}</h6>,
    normal: ({ children }) => <p className="mt-6">{children}</p>,
    lead: ({ children }) => <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-6 mb-6">{children}</p>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-zinc-200 dark:border-zinc-700 pl-4 italic my-6">{children}</blockquote>,
  },
  types: {
    section: ({ value }: { value: Section }) => {
      const sectionId = value.title ? value.title.toLowerCase().replace(/\s+/g, '-') : `section-${Date.now().toString(36)}`;
      
      return (
        <div id={sectionId} className="my-12">
          {value.title && <mdx.h2 id={sectionId}>{value.title}</mdx.h2>}
          {value.label && <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>}
          {value.content && <PortableText value={value.content} components={components} />}
        </div>
      );
    },
    contentBlock: ({ value }: { value: ContentBlock }) => {
      const blockId = value.title ? value.title.toLowerCase().replace(/\s+/g, '-') : `block-${Date.now().toString(36)}`;
      
      return (
        <div id={blockId} className="my-8">
          {value.title && <mdx.h2 id={blockId}>{value.title}</mdx.h2>}
          {value.label && <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>}
          {value.content && <PortableText value={value.content} components={components} />}
        </div>
      );
    },
    note: ({ value }: { value: NoteBlock }) => (
      <div className="my-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <PortableText value={value.content} components={components} />
          </div>
        </div>
      </div>
    ),
    math: ({ value }: { value: MathBlock }) => (
      <Math display={true}>{value.formula}</Math>
    ),
    mathBlock: ({ value }: { value: MathBlock }) => (
      <Math display={true}>{value.formula}</Math>
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
        </figure>
      );
    },
    code: ({ value }: { value: any }) => {
      return (
        <mdx.CodeGroup title={value.filename || ''}>
          <mdx.code className={value.language ? `language-${value.language}` : undefined}>
            {value.code}
          </mdx.code>
        </mdx.CodeGroup>
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
              <div key={index} className="my-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
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
                          <div key={paramIndex} className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-baseline">
                              <code className="font-mono text-sm">{param.name}</code>
                              {param.type && <span className="text-xs text-zinc-500 ml-2">{param.type}</span>}
                              {param.optional && <span className="text-xs text-zinc-500 ml-1">(optional)</span>}
                            </div>
                            {param.description && <div className="mt-1 text-sm"><PortableText value={param.description} components={components} /></div>}
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
              <div key={index} className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                <div className="flex items-baseline">
                  <code className="font-mono">{item.name}</code>
                  {item.parametersString && <span className="text-sm text-zinc-500 ml-2">{item.parametersString}</span>}
                </div>
                {item.description && <div className="mt-1"><PortableText value={item.description} components={components} /></div>}
              </div>
            ))}
          </div>
        </div>
      );
    },
    block: ({ value }: { value: any }) => {
      // If it's a block with children, render based on style
      if (value.children && Array.isArray(value.children)) {
        const text = value.children?.map((child: any) => child.text).join('') || '';
        
        // Render based on style
        switch (value.style) {
          case 'h1':
            return <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{text}</h1>;
          case 'h2':
            const id = 'section-' + Date.now().toString(36);
            return <mdx.h2 id={id}>{text}</mdx.h2>;
          case 'h3':
            const subId = 'subsection-' + Date.now().toString(36);
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
      console.log('Unknown block type:', value);
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
    link: ({ value, children }) => {
      const rel = !value?.href?.startsWith('/') ? 'noreferrer noopener' : undefined;
      return (
        <a href={value?.href} rel={rel} className="text-blue-600 dark:text-blue-400 hover:underline">
          {children}
        </a>
      );
    },
    mathInline: ({ children }) => {
      return <Math display={false}>{children as string}</Math>;
    },
    // Fallback for any other mark types
    highlight: ({ children }) => <mark className="bg-yellow-200 dark:bg-yellow-800/50">{children}</mark>,
    underline: ({ children }) => <u>{children}</u>,
    strikethrough: ({ children }) => <s>{children}</s>,
    subscript: ({ children }) => <sub>{children}</sub>,
    superscript: ({ children }) => <sup>{children}</sup>,
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-6 my-4">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-6 my-4">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="mb-2">{children}</li>,
    number: ({ children }) => <li className="mb-2">{children}</li>,
  },
  // Fallback for unknown types
  unknownType: ({ value, isInline }) => {
    console.warn('Unknown type:', value);
    return (
      <pre className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs overflow-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  },
  // Fallback for unknown marks
  unknownMark: ({ children, markType }) => {
    console.warn('Unknown mark type:', markType);
    return <>{children}</>;
  },
} 
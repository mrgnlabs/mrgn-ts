'use client'

import React from 'react'
import { PortableText } from '@portabletext/react'
import * as mdx from '~/components/mdx'
import { DocPage } from './SanitySchemaTypes'
import { components } from './SanityPortableTextComponents'

/**
 * SanityToMdx component
 * 
 * This component takes Sanity content and renders it using the MDX components
 * for consistent styling with the rest of the site.
 */
export function SanityToMdx({ page }: { page: DocPage }) {
  return (
    <mdx.wrapper>
      <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{page.title}</h1>

      {page.leadText && (
        <div className="lead">
          <PortableText value={page.leadText} components={components} />
        </div>
      )}

      <hr />

      {page.content && (
        <>
          {page.content.map((block, index) => {
            if (!block) return null;
            
            // For block types, we need to handle them differently
            if (block._type === 'block') {
              // Convert the block to a paragraph if it has children
              if ((block as any).children && (block as any).children.length > 0) {
                return (
                  <p key={(block as any)._key || index}>
                    {(block as any).children.map((child: any, childIndex: number) => (
                      <span key={childIndex}>{child.text}</span>
                    ))}
                  </p>
                );
              }
              return null;
            }
            
            // For other block types, use PortableText with our components
            return (
              <div key={(block as any)._key || index}>
                <PortableText value={[block]} components={components} />
              </div>
            );
          })}
        </>
      )}
    </mdx.wrapper>
  )
} 
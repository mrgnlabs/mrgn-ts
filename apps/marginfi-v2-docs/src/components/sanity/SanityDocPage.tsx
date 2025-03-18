'use client'

import { DocPage } from './SanitySchemaTypes'
import { SanityToMdx } from './SanityToMdx'
import { PortableText } from '@portabletext/react'
import { portableTextComponents } from './SanityPortableTextComponents'

/**
 * SanityDocPage component
 * 
 * This component renders a Sanity document page using the MDX components
 * for consistent styling with the rest of the site.
 */
export function SanityDocPage({ page }: { page: DocPage }) {
  if (!page) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{page.title}</h1>

        {page.leadText && (
          <div className="lead prose dark:prose-invert mt-6">
            <PortableText value={page.leadText} components={portableTextComponents} />
          </div>
        )}

        <hr className="my-6" />

        <SanityToMdx content={page.content} />
      </div>
    </div>
  )
} 
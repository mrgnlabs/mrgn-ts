'use client'

import React, { useMemo } from 'react'
import { PortableText } from '@portabletext/react'
import { portableTextComponents } from './SanityPortableTextComponents'

/**
 * SanityToMdx component
 * 
 * This component takes Sanity content and renders it using the MDX components
 * for consistent styling with the rest of the site.
 */
export function SanityToMdx({ content }: { content: any }) {
  if (!content) {
    return null
  }

  return (
    <div className="prose dark:prose-invert">
      <PortableText value={content} components={portableTextComponents} />
    </div>
  )
} 
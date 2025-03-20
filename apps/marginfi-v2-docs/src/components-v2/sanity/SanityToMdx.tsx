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

  // Debug the content structure
  React.useEffect(() => {
    console.log('SanityToMdx content:', content);
    
    // Check for propertyList and table items
    const propertyLists = content.filter((item: any) => item._type === 'propertyList');
    const tables = content.filter((item: any) => item._type === 'table');
    
    if (propertyLists.length > 0) {
      console.log('PropertyList items:', propertyLists);
    }
    
    if (tables.length > 0) {
      console.log('Table items:', tables);
    }
  }, [content]);

  return (
    <div className="prose dark:prose-invert">
      <PortableText value={content} components={portableTextComponents} />
    </div>
  )
} 
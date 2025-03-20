'use client'

import React, { useMemo } from 'react'
import { PortableText } from '@portabletext/react'
import { portableTextComponents, debugPortableTextContent } from './SanityPortableTextComponents'

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
    console.log('=== SANITY MDX CONTENT DEBUGGING ===');
    console.log('Content is Array:', Array.isArray(content));
    console.log('Content length:', Array.isArray(content) ? content.length : 'N/A');
    
    // Use our detailed debug function
    debugPortableTextContent(content);
    
    // Check specific blocks we're interested in
    if (Array.isArray(content)) {
      // Find all blocks by type 
      const blockTypeCount = content.reduce((acc: Record<string, number>, item: any) => {
        const type = item._type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Block type counts:', blockTypeCount);
      
      // Check if we have headings to understand document structure
      const headings = content.filter((item: any) => 
        item._type === 'block' && 
        item.style && 
        ['h1', 'h2', 'h3', 'h4'].includes(item.style)
      );
      
      if (headings.length > 0) {
        console.log('Document structure (headings):');
        headings.forEach((heading: any) => {
          const text = heading.children && 
                      heading.children[0] && 
                      heading.children[0].text || '[empty heading]';
          console.log(`${heading.style}: ${text}`);
        });
      }
    }
    
    console.log('=== END SANITY MDX CONTENT DEBUGGING ===');
  }, [content]);

  return (
    <div className="prose dark:prose-invert">
      <PortableText value={content} components={portableTextComponents} />
    </div>
  )
} 
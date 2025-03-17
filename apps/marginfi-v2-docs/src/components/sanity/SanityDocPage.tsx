'use client'

import { DocPage } from './SanitySchemaTypes'
import { SanityToMdx } from './SanityToMdx'

/**
 * SanityDocPage component
 * 
 * This component renders a Sanity document page using the MDX components
 * for consistent styling with the rest of the site.
 */
export function SanityDocPage({ page }: { page: DocPage }) {
  return <SanityToMdx page={page} />
} 
import { type Metadata } from 'next'

import { Layout } from '~/components-v2/Layout'
import { type Section } from '~/components-v2/SectionProvider'

import '~/styles/tailwind.css'
import 'katex/dist/katex.min.css'

export const metadata: Metadata = {
  title: {
    template: '%s - marginfi Documentation (v2)',
    default: 'marginfi Documentation (v2)',
  },
}

export default async function V2SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // For now, we'll pass an empty sections object since we'll handle sections through Sanity
  const allSections: Record<string, Array<Section>> = {}

  return (
    <div className="flex min-h-full bg-background antialiased">
      <div className="w-full">
        <Layout allSections={allSections}>{children}</Layout>
      </div>
    </div>
  )
} 
import { type Metadata } from 'next'
import glob from 'fast-glob'

import { V2Layout } from './_components/Layout'
import { type Section } from '~/components/SectionProvider'

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
  // Adjust the path to reflect the folder structure where your MDX files live
  let pages = await glob('**/*.mdx', { cwd: 'src/app/(v2)' })
  let allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`./${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  let allSections = Object.fromEntries(allSectionsEntries)

  return (
    <div className="flex min-h-full bg-background antialiased">
      <div className="w-full">
        <V2Layout allSections={allSections}>{children}</V2Layout>
      </div>
    </div>
  )
} 
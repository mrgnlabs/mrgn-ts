// app/(site)/layout.tsx
import { type Metadata } from 'next'
import glob from 'fast-glob'

import { Layout } from '~/components/Layout'
import { type Section } from '~/components/SectionProvider'

import '~/styles/tailwind.css'
import 'katex/dist/katex.min.css'

export const metadata: Metadata = {
  title: {
    template: '%s - marginfi Documentation',
    default: 'marginfi Documentation',
  },
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Adjust the path to reflect the folder structure where your MDX files live
  let pages = await glob('**/*.mdx', { cwd: 'src/app/(site)' })
  let allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`./${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  let allSections = Object.fromEntries(allSectionsEntries)

  return (
    <>
      {/* 
        We don't repeat <html> or <body> because they're already in the root layout.
        Instead, we can just wrap the site layout in a <div> or fragment.
      */}
      <div className="flex min-h-full bg-background antialiased">
        <div className="w-full">
          <Layout allSections={allSections}>{children}</Layout>
        </div>
      </div>
    </>
  )
}
import { type Metadata } from 'next'
import glob from 'fast-glob'

import { Providers } from '~/app/providers'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let pages = await glob('**/*.mdx', { cwd: 'src/app' })
  let allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`./${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  let allSections = Object.fromEntries(allSectionsEntries)

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-full bg-background antialiased">
        <Providers>
          <div className="w-full">
            <Layout allSections={allSections}>{children}</Layout>
          </div>
        </Providers>
      </body>
    </html>
  )
}

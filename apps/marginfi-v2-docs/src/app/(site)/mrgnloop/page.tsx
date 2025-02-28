import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/doc/DocPage'
import { createMetadata } from '~/components/doc/Metadata'
import { Metadata } from 'next'

async function getMrgnloopData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'mrgnloop' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getMrgnloopData()
  return createMetadata(page)
}

export default async function MrgnloopPage() {
  const page = await getMrgnloopData()
  return <DocPage page={page} />
} 
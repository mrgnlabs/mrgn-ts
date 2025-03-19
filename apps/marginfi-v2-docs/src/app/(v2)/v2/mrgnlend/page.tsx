import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getMrgnlendData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'mrgnlend' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getMrgnlendData()
  return createMetadata(page)
}

export default async function MrgnlendPage() {
  const page = await getMrgnlendData()
  return <DocPage page={page} />
} 
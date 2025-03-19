import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getLipData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'lip' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLipData()
  return createMetadata(page)
}

export default async function LipPage() {
  const page = await getLipData()
  return <DocPage page={page} />
} 
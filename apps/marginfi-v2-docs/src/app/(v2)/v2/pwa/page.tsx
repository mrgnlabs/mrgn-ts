import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getPwaData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'pwa' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPwaData()
  return createMetadata(page)
}

export default async function PwaPage() {
  const page = await getPwaData()
  return <DocPage page={page} />
} 
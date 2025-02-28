import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/doc/DocPage'
import { createMetadata } from '~/components/doc/Metadata'
import { Metadata } from 'next'

async function getYbxData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'ybx' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getYbxData()
  return createMetadata(page)
}

export default async function YbxPage() {
  const page = await getYbxData()
  return <DocPage page={page} />
} 
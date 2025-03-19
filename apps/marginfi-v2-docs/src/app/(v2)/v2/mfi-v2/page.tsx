import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getMfiV2Data() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'mfi-v2' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getMfiV2Data()
  return createMetadata(page)
}

export default async function MfiV2Page() {
  const page = await getMfiV2Data()
  return <DocPage page={page} />
} 
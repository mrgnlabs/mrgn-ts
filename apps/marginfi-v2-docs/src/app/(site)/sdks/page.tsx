import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/doc/DocPage'
import { createMetadata } from '~/components/doc/Metadata'
import { Metadata } from 'next'

async function getSdksData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'sdks' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getSdksData()
  return createMetadata(page)
}

export default async function SdksPage() {
  const page = await getSdksData()
  return <DocPage page={page} />
} 
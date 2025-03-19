import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/sanity'
import { createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function getProtocolDesignData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'protocol-design' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getProtocolDesignData()
  return createMetadata(page)
}

export default async function ProtocolDesignPage() {
  const page = await getProtocolDesignData()
  return <DocPage page={page} />
} 
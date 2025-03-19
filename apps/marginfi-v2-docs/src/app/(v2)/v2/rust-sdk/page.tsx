import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getRustSdkData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'rust-sdk' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getRustSdkData()
  return createMetadata(page)
}

export default async function RustSdkPage() {
  const page = await getRustSdkData()
  return <DocPage page={page} />
} 
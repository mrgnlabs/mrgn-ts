import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage, createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getFaqsData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'faqs' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getFaqsData()
  return createMetadata(page)
}

export default async function FaqsPage() {
  const page = await getFaqsData()
  return <DocPage page={page} />
}
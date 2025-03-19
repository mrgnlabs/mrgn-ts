import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/sanity'
import { createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function getLstData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'lst' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLstData()
  return createMetadata(page)
}

export default async function LstPage() {
  const page = await getLstData()
  return <DocPage page={page} />
} 
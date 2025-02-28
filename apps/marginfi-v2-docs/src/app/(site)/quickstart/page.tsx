import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/doc/DocPage'
import { createMetadata } from '~/components/doc/Metadata'
import { Metadata } from 'next'

async function getQuickstartData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'quickstart' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getQuickstartData()
  return createMetadata(page)
}

export default async function QuickstartPage() {
  const page = await getQuickstartData()
  return <DocPage page={page} />
} 
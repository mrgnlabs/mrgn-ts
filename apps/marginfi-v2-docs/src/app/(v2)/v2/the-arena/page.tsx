import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/sanity'
import { createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function getTheArenaData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'the-arena' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getTheArenaData()
  return createMetadata(page)
}

export default async function TheArenaPage() {
  const page = await getTheArenaData()
  return <DocPage page={page} />
} 
import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage, createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function getTsSdkData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'ts-sdk' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getTsSdkData()
  return createMetadata(page)
}

export default async function TsSdkPage() {
  const page = await getTsSdkData()
  return <DocPage page={page} />
} 
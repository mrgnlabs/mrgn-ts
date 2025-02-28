import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/doc/DocPage'
import { createMetadata } from '~/components/doc/Metadata'
import { Metadata } from 'next'

async function getUseCasesData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'use-cases' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getUseCasesData()
  return createMetadata(page)
}

export default async function UseCasesPage() {
  const page = await getUseCasesData()
  return <DocPage page={page} />
} 
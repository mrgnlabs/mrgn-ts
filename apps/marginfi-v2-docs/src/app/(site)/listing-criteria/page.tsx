import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/sanity'
import { createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function getListingCriteriaData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'listing-criteria' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getListingCriteriaData()
  return createMetadata(page)
}

export default async function ListingCriteriaPage() {
  const page = await getListingCriteriaData()
  return <DocPage page={page} />
} 
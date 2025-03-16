import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components/sanity'
import { createMetadata } from '~/components/sanity'
import { Metadata } from 'next'

async function getStakedCollateralData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'staked-collateral' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStakedCollateralData()
  return createMetadata(page)
}

export default async function StakedCollateralPage() {
  const page = await getStakedCollateralData()
  return <DocPage page={page} />
} 
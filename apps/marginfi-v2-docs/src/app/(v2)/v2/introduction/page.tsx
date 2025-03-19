import { client } from '@/sanity/lib/client'
import { getDocPageBySlug } from '@/sanity/queries'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'
import { Metadata } from 'next'

async function getIntroductionData() {
  return client.fetch(
    getDocPageBySlug,
    { slug: 'introduction' }
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getIntroductionData()
  return createMetadata(page)
}

export default async function IntroductionPage() {
  const page = await getIntroductionData()
  return <DocPage page={page} />
} 
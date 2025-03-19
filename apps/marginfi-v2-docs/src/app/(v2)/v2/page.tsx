import { draftMode } from 'next/headers'
import { client } from '~/sanity/lib/client'
import { DocPage } from '~/components-v2/sanity'
import { createMetadata } from '~/components-v2/sanity'

// export async function generateMetadata() {
//   const { isEnabled: isDraftMode } = draftMode()
//   const doc = await client.fetch(
//     `*[_type == "docPage" && slug.current == "home"][0]{
//       title,
//       description,
//       "slug": slug.current
//     }`,
//     {},
//     { isDraftMode }
//   )

//   return createMetadata({
//     title: doc?.title || 'marginfi documentation',
//     description: doc?.description || "Learn everything there is to know about the marginfi protocol and how to integrate marginfi's liquidity layer into your product.",
//   })
// }

export default async function HomePage() {
  const { isEnabled: isDraftMode } = draftMode()
  // const doc = await client.fetch(
  //   `*[_type == "docPage" && slug.current == "home"][0]{
  //     title,
  //     description,
  //     content,
  //     "slug": slug.current
  //   }`,
  //   {},
  //   { isDraftMode }
  // )

  return <div>Hello</div>
} 
import { sanityClient } from "~/lib/sanity"
import { PortableText } from '@portabletext/react'

type FAQ = {
  _id: string
  question: string
  answer: any
  tag?: string
  label?: string
}

async function getFAQs(): Promise<FAQ[]> {
  return sanityClient.fetch(`*[_type == "faq"] | order(_createdAt asc)`)
}

export default async function FAQPage() {
  const faqs = await getFAQs()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
      <p className="text-lg mb-4">In this guide, we will answer commonly asked questions regarding the marginfi protocol.</p>

      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq._id} className="border-b pb-4">
            <h2 className="text-xl font-semibold">{faq.question}</h2>
            <div className="text-gray-700 mt-2">
              <PortableText value={faq.answer} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
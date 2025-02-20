// app/faq/page.tsx (App Router example)
import { client } from '@/sanity/lib/client'
import { PortableText } from '@portabletext/react'
import { Prose } from '~/components/Prose'

async function getFaqData() {
  return await client.fetch(/* groq */ `
    *[_type == "faq"][0]{
      title,
      questions[]{
        _key,
        question,
        answer,
        tag,
        label
      }
    }
  `)
}

export default async function FaqPage() {
  const faq = await getFaqData()

  return (
    <div className="pt-16 pb-10">
      <h1 className="text-3xl font-bold mb-4">{faq?.title}</h1>
      {faq?.questions?.map((item: any) => (
        <div key={item._key} className="mb-8">
          {item.tag && (
            <div className="mb-1 text-sm font-mono text-zinc-400">
              {item.tag}
            </div>
          )}
          <h2 className="text-xl font-semibold mb-2">{item.question}</h2>
          {item.label && (
            <p className="text-sm text-zinc-500 italic mb-2">{item.label}</p>
          )}
          <Prose>
            <PortableText value={item.answer} />
          </Prose>
        </div>
      ))}
    </div>
  )
}
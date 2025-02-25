// app/faq/page.tsx (App Router example)
import { client } from '@/sanity/lib/client'
import { PortableTextFaq } from '~/components/faq/PortableTextFaq'
import { Prose } from '~/components/Prose'
import { Note } from '~/components/mdx'
import { Button } from '~/components/Button'

async function getFaqData() {
  return client.fetch(/* groq */ `
    *[_type == "faq"][0]{
      title,
      description,
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
    <Prose className="pt-16 pb-10">
      <h1>{faq?.title}</h1>
      <p className="lead">{faq?.description}</p>
      <hr className="my-8" />
      <Note>
        If you do not see an answer to your question on this page, please contact marginfi support by joining at{' '}
        <Button href="https://support.marginfi.com" variant="text">
          support.marginfi.com
        </Button>.
      </Note>
      {faq?.questions?.map((item: any) => (
        <div key={item._key} className="mt-12">
          {item.tag && (
            <div className="mb-1 text-sm font-mono text-zinc-400">
              {item.tag}
            </div>
          )}
          <h2>{item.question}</h2>
          {item.label && (
            <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{item.label}</p>
          )}
          <PortableTextFaq value={item.answer} />
        </div>
      ))}
    </Prose>
  )
}

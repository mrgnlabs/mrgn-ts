// src/components/doc/DocPage.tsx
import { Prose } from '~/components/Prose'
import { Note, Properties, Property } from '~/components/mdx'
import { ImageComponent } from '~/components/ImageComponent'
import { Math } from '~/components/Math'
import { PortableText } from '@portabletext/react'
import { Button } from '~/components/Button'
import { Heading } from '~/components/Heading'
import { Feedback } from '~/components/Feedback'

const components = {
  types: {
    note: ({ value }: any) => (
      <Note>
        <PortableText value={value.content} components={components} />
      </Note>
    ),
    mathBlock: ({ value }: any) => <Math display={true}>{value.formula}</Math>,
    imageWithCaption: ({ value }: any) => (
      <ImageComponent
        src={value.image.asset.url}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
  },
  block: {
    h1: ({ children }: any) => <h1>{children}</h1>,
    h2: ({ children }: any) => {
      const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : ''
      return <Heading level={2} id={id}>{children}</Heading>
    },
    h3: ({ children }: any) => {
      const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : ''
      return <Heading level={3} id={id}>{children}</Heading>
    },
    normal: ({ children }: any) => <p>{children}</p>,
    lead: ({ children }: any) => <p className="lead">{children}</p>,
  },
  marks: {
    strong: ({ children }: any) => <strong>{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    code: ({ children }: any) => <code>{children}</code>,
    link: ({ value, children }: any) => (
      <Button href={value?.href} variant={value?.variant || 'text'}>
        {children}
      </Button>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc pl-4">{children}</ul>,
    number: ({ children }: any) => (
      <ol className="list-decimal pl-4">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }: any) => <li>{children}</li>,
    number: ({ children }: any) => <li>{children}</li>,
  },
}

export function DocPage({ page }: { page: any }) {
  if (!page) {
    return <div>Loading...</div>
  }

  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <Prose className="flex-auto">
        {/* Page Title */}
        <h1>{page.title}</h1>

        {/* Render leadText as PortableText instead of a plain paragraph */}
        {page.leadText && (
          <PortableText value={page.leadText} components={components} />
        )}

        <hr className="my-8" />

        {page.content?.map((section: any, index: number) => {
          if (section._type === 'section') {
            // Create URL-friendly anchor from title
            const anchor = section.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            
            return (
              <div key={section._key}>
                {index > 0 && <hr className="my-8" />}
                <div className="mt-12">
                  <Heading level={2} id={anchor}>
                    {section.title}
                  </Heading>
                  {section.label && (
                    <p className="text-sm text-zinc-500 italic -mt-4 mb-4">
                      {section.label}
                    </p>
                  )}
                  <PortableText value={section.content} components={components} />
                </div>
              </div>
            )
          }

          // Handle "properties" blocks
          if (section._type === 'properties') {
            return (
              <div key={section._key}>
                {index > 0 && <hr className="my-8" />}
                <div className="my-8">
                  <Properties>
                    {section.items?.map((item: any, i: number) => (
                      <Property key={i} name={item.name} type={item.type}>
                        <PortableText
                          value={item.description}
                          components={components}
                        />
                      </Property>
                    ))}
                  </Properties>
                </div>
              </div>
            )
          }

          // Everything else (note, mathBlock, etc.) 
          return (
            <div key={section._key}>
              {index > 0 && <hr className="my-8" />}
              <div className="my-8">
                <PortableText value={[section]} components={components} />
              </div>
            </div>
          )
        })}
      </Prose>
      <footer className="mx-auto mt-16 w-full max-w-2xl lg:max-w-5xl">
        <Feedback />
      </footer>
    </article>
  )
}

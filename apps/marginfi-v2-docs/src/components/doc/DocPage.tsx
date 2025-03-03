// src/components/doc/DocPage.tsx
import { Prose } from '~/components/Prose'
import { Note, Properties, Property } from '~/components/mdx'
import { ImageComponent } from '~/components/ImageComponent'
import { Math } from '~/components/Math'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import { Button } from '~/components/Button'
import { Heading } from '~/components/Heading'
import { Feedback } from '~/components/Feedback'
import { CodeGroup } from '~/components/Code'
import { CodeBlockComponent } from './CodeBlockComponent'

interface SanityImage {
  asset: {
    url: string;
  };
}

interface ImageWithCaption {
  _type: 'imageWithCaption';
  image: SanityImage;
  alt?: string;
}

interface MathBlock {
  _type: 'mathBlock';
  formula: string;
}

interface NoteBlock {
  _type: 'note';
  content: any[];
}

interface CodeBlock {
  _type: 'codeBlock';
  code: string;
  language?: string;
  title?: string;
}

interface Section {
  _type: 'section';
  _key: string;
  title?: string;
  label?: string;
  content: any[];
}

interface Properties {
  _type: 'properties';
  _key: string;
  items?: Array<{
    name: string;
    type: string;
    description: any[];
  }>;
}

interface DocPage {
  title: string;
  leadText?: any[];
  content?: Array<Section | NoteBlock | MathBlock | ImageWithCaption | Properties | CodeBlock>;
}

const components: PortableTextComponents = {
  types: {
    note: ({ value }: { value: NoteBlock }) => (
      <Note>
        <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
          <PortableText value={value.content} components={components} />
        </div>
      </Note>
    ),
    mathBlock: ({ value }: { value: MathBlock }) => (
      <Math display={true}>{value.formula}</Math>
    ),
    imageWithCaption: ({ value }: { value: ImageWithCaption }) => (
      <ImageComponent
        src={value.image.asset.url}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
    codeBlock: ({ value }: { value: CodeBlock }) => (
      <CodeBlockComponent
        code={value.code}
        language={value.language}
        title={value.title}
      />
    ),
  },
  block: {
    h1: ({ children }) => <h1>{children}</h1>,
    h2: ({ children }) => {
      const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : ''
      return <Heading level={2} id={id}>{children}</Heading>
    },
    h3: ({ children }) => {
      const id = typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '-') : ''
      return <Heading level={3} id={id}>{children}</Heading>
    },
    normal: ({ children }) => <p>{children}</p>,
    lead: ({ children }) => <p className="lead">{children}</p>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code>{children}</code>,
    link: ({ value, children }) => (
      <Button href={value?.href} variant={value?.variant || 'text'}>
        {children}
      </Button>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-4">{children}</ul>,
    number: ({ children }) => (
      <ol className="list-decimal pl-4">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
}

export function DocPage({ page }: { page: DocPage }) {
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
                <div className="my-6">
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

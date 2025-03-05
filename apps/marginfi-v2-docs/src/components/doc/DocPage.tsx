'use client'

// src/components/doc/DocPage.tsx
import { Prose } from '~/components/Prose'
import { Note, Properties, Property, CodeGroup, MethodList, Method } from '~/components/mdx'
import { ImageComponent } from '~/components/ImageComponent'
import { Math } from '~/components/Math'
import { PortableText, PortableTextComponents } from '@portabletext/react'
import { Button } from '~/components/Button'
import { Heading } from '~/components/Heading'
import { Feedback } from '~/components/Feedback'
import { useSectionStore } from '~/components/SectionProvider'
import { useEffect } from 'react'
import { urlFor } from '~/sanity/lib/image'
import React from 'react'

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

interface MathInline {
  _type: 'mathInline';
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

interface SectionInfo {
  id: string;
  title: string;
  tag?: string;
}

interface Properties {
  _type: 'properties';
  _key: string;
  items?: Array<{
    name: string;
    parameters: string;
    resultType: string;
    description: any[];
  }>;
}

interface MethodListBlock {
  _type: 'methodList';
  title: string;
  methods: Array<{
    name: string;
    arguments: string;
    description: any[];
  }>;
}

interface DocPage {
  title: string;
  leadText?: any[];
  content?: Array<Section | NoteBlock | MathBlock | ImageWithCaption | Properties | CodeBlock | MethodListBlock>;
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
      <div className="my-6 flex justify-center">
        <Math display={true} className="text-lg">{value.formula}</Math>
      </div>
    ),
    mathInline: ({ value }: { value: MathInline }) => (
      <Math display={false}>{value.formula}</Math>
    ),
    imageWithCaption: ({ value }: { value: ImageWithCaption }) => (
      <ImageComponent
        src={urlFor(value.image).url()}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
    codeBlock: ({ value }: { value: CodeBlock }) => {
      if (!value?.code) {
        console.error('Code block is missing required code property:', value);
        return null;
      }

      return (
        <CodeGroup title={value.title || ''}>
          <code className={value.language ? `language-${value.language}` : undefined}>
            {value.code}
          </code>
        </CodeGroup>
      );
    },
    properties: ({ value }: { value: Properties }) => (
      <Properties>
        {value.items?.map((item, i) => (
          <Property 
            key={i} 
            name={item.name}
            parameters={item.parameters}
            resultType={item.resultType}
          >
            {item.description && (
              <PortableText
                value={item.description}
                components={components}
              />
            )}
          </Property>
        ))}
      </Properties>
    ),
    section: ({ value }: { value: Section }) => (
      <div>
        {value.title && <Heading level={2} id={value.title.toLowerCase().replace(/\s+/g, '-')}>{value.title}</Heading>}
        {value.label && <p className="text-sm text-zinc-500 italic -mt-4 mb-4">{value.label}</p>}
        <PortableText value={value.content} components={components} />
      </div>
    ),
    methodList: ({ value }: { value: MethodListBlock }) => (
      <MethodList title={value.title}>
        {value.methods?.map((method, i) => (
          <Method 
            key={i}
            name={method.name}
            args={method.arguments}
          >
            <PortableText
              value={method.description}
              components={{
                marks: {
                  strong: ({children}) => <strong>{children}</strong>,
                  em: ({children}) => <em>{children}</em>,
                  code: ({children}) => <code>{children}</code>,
                },
                block: {
                  normal: ({children}) => <div>{children}</div>
                }
              }}
            />
          </Method>
        ))}
      </MethodList>
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
    normal: ({ children }) => <div className="my-4">{children}</div>,
    lead: ({ children }) => <div className="lead my-4">{children}</div>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code>{children}</code>,
    link: ({ value, children }) => {
      // Check if children already contain an anchor tag
      const hasNestedLink = React.Children.toArray(children).some(
        child => React.isValidElement(child) && (child.type === 'a' || child.type === Button)
      );

      if (hasNestedLink) {
        return <span className="text-mrgn-chartreuse">{children}</span>;
      }

      return (
        <Button href={value?.href} variant={value?.variant || 'text'}>
          {children}
        </Button>
      );
    },
    mathInline: ({ value, children }) => (
      <span className="inline-flex items-baseline">
        <Math display={false}>{value.formula}</Math>
      </span>
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

function SectionTracker({ sections }: { sections: SectionInfo[] }) {
  const registerHeading = useSectionStore((state) => state.registerHeading)

  useEffect(() => {
    // Wait for next frame to ensure elements are in the DOM
    const registerSections = () => {
      sections.forEach((section) => {
        if (section && section.id) {
          const element = document.getElementById(section.id) as HTMLHeadingElement | null
          if (element) {
            registerHeading({
              id: section.id,
              ref: { current: element },
              offsetRem: 0,
              title: section.title || '',
              tag: section.tag,
            })
          }
        }
      })
    }

    // Initial registration
    requestAnimationFrame(registerSections)

    // Re-register on scroll to ensure all sections are captured
    const handleScroll = () => {
      requestAnimationFrame(registerSections)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections, registerHeading])

  return null
}

export function DocPage({ page }: { page: DocPage }) {
  if (!page) {
    return <div>Loading...</div>
  }

  // Get sections from the page content
  const sections = page.content?.map((section: any): SectionInfo | null => {
    if (section._type === 'section') {
      return {
        id: section.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
        title: section.title || '',
        tag: section.label || undefined,
      }
    }
    return null
  }).filter((section): section is SectionInfo => section !== null) || []

  return (
    <article className="flex h-full flex-col pb-10 pt-16">
      <SectionTracker sections={sections} />
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
                      <Property 
                        key={i} 
                        name={item.name}
                        parameters={item.parameters}
                        resultType={item.resultType}
                      >
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

          // Handle "methodList" blocks
          if (section._type === 'methodList') {
            return (
              <div key={section._key}>
                {index > 0 && <hr className="my-8" />}
                <div className="my-6">
                  <MethodList title={section.title}>
                    {section.methods?.map((method: any, i: number) => (
                      <Method 
                        key={i}
                        name={method.name}
                        args={method.arguments}
                      >
                        <PortableText
                          value={method.description}
                          components={{
                            marks: {
                              strong: ({children}) => <strong>{children}</strong>,
                              em: ({children}) => <em>{children}</em>,
                              code: ({children}) => <code>{children}</code>,
                            },
                            block: {
                              normal: ({children}) => <div>{children}</div>
                            }
                          }}
                        />
                      </Method>
                    ))}
                  </MethodList>
                </div>
              </div>
            )
          }

          // Everything else (note, mathBlock, etc.) 
          return (
            <div key={section._key}>
              {index > 0 && <hr className="my-8" />}
              <div className="my-8">
                {section._type === 'methodList' ? (
                  <MethodList title={section.title}>
                    {section.methods?.map((method: any, i: number) => (
                      <Method 
                        key={i}
                        name={method.name}
                        args={method.arguments}
                      >
                        <PortableText
                          value={method.description}
                          components={{
                            marks: {
                              strong: ({children}) => <strong>{children}</strong>,
                              em: ({children}) => <em>{children}</em>,
                              code: ({children}) => <code>{children}</code>,
                            },
                            block: {
                              normal: ({children}) => <div>{children}</div>
                            }
                          }}
                        />
                      </Method>
                    ))}
                  </MethodList>
                ) : (
                  <PortableText value={[section]} components={components} />
                )}
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

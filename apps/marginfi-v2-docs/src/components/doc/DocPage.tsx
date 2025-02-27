import { Prose } from '~/components/Prose'
import { Note, Properties, Property } from '~/components/mdx'
import { ImageComponent } from '~/components/ImageComponent'
import { Math } from '~/components/Math'
import { PortableText } from '@portabletext/react'
import { Button } from '~/components/Button'

const components = {
  types: {
    note: ({value}: any) => (
      <Note>
        <PortableText value={value.content} components={components} />
      </Note>
    ),
    mathBlock: ({value}: any) => (
      <Math>{value.formula}</Math>
    ),
    imageWithCaption: ({value}: any) => (
      <ImageComponent
        src={value.image.asset.url}
        alt={value.alt || ''}
        isBig={true}
      />
    ),
  },
  block: {
    normal: ({children}: any) => <p>{children}</p>,
    h1: ({children}: any) => <h1>{children}</h1>,
    h2: ({children}: any) => <h2>{children}</h2>,
    h3: ({children}: any) => <h3>{children}</h3>,
  },
  marks: {
    strong: ({children}: any) => <strong>{children}</strong>,
    em: ({children}: any) => <em>{children}</em>,
    code: ({children}: any) => <code>{children}</code>,
    link: ({value, children}: any) => (
      <Button href={value?.href} variant={value?.variant || 'text'}>
        {children}
      </Button>
    ),
  },
  list: {
    bullet: ({children}: any) => <ul className="list-disc pl-4">{children}</ul>,
    number: ({children}: any) => <ol className="list-decimal pl-4">{children}</ol>,
  },
  listItem: {
    bullet: ({children}: any) => <li>{children}</li>,
    number: ({children}: any) => <li>{children}</li>,
  },
}

export function DocPage({ page }: { page: any }) {
  if (!page) {
    return <div>Loading...</div>
  }

  return (
    <Prose className="pt-16 pb-10">
      <h1>{page.title}</h1>
      <p className="lead">{page.leadText}</p>
      <hr className="my-8" />
      
      {page.content?.map((section: any) => {
        if (section._type === 'section') {
          return (
            <div key={section._key} className="mt-12">
              {section.tag && (
                <div className="mb-1 text-sm font-mono text-zinc-400">
                  {section.tag}
                </div>
              )}
              <h2>{section.title}</h2>
              {section.label && (
                <p className="text-sm text-zinc-500 italic -mt-4 mb-4">
                  {section.label}
                </p>
              )}
              <PortableText 
                value={section.content} 
                components={components}
              />
            </div>
          )
        }

        // Handle "properties" blocks
        if (section._type === 'properties') {
          return (
            <div key={section._key} className="my-8">
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
          )
        }
        
        return (
          <div key={section._key} className="my-8">
            <PortableText 
              value={[section]} 
              components={components}
            />
          </div>
        )
      })}
    </Prose>
  )
} 
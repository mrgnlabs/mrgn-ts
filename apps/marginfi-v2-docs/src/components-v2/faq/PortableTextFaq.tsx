// src/components/faq/PortableTextFaq.tsx
import { PortableText } from '@portabletext/react'
import { Button } from '~/components/Button'

const components = {
  marks: {
    link: ({value, children}: any) => {
      return (
        <Button href={value?.href} variant="text">
          {children}
        </Button>
      )
    },
  },
  block: {
    normal: ({children}: any) => <p className="mt-4">{children}</p>,
  },
}

export function PortableTextFaq({ value }: { value: any }) {
  return <PortableText value={value} components={components} />
}

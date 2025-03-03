'use client'

import { useEffect, useState } from 'react'
import { highlightCode } from '~/utils/syntaxHighlighting'
import { CodeGroup, Code } from '~/components/Code'

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlockComponent({ code, language, title }: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState(code)

  useEffect(() => {
    highlightCode(code, language).then(setHighlightedCode)
  }, [code, language])

  return (
    <CodeGroup title={title || ''}>
      <Code>{highlightedCode}</Code>
    </CodeGroup>
  )
} 
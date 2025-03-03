import { getHighlighter, renderToHtml } from 'shiki'

let highlighter: Awaited<ReturnType<typeof getHighlighter>> | null = null

export async function highlightCode(code: string, language: string = 'text') {
  if (!highlighter) {
    highlighter = await getHighlighter({ theme: 'css-variables' })
  }

  try {
    const tokens = highlighter.codeToThemedTokens(code, language)
    return renderToHtml(tokens, {
      elements: {
        pre: ({ children }) => children,
        code: ({ children }) => children,
        line: ({ children }) => `<span>${children}</span>`,
      },
    })
  } catch (error) {
    // Fallback to plain text if language isn't supported
    return code
  }
} 
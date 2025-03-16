'use client'

import { Box } from '@sanity/ui'
import { PortableText } from '@portabletext/react'

interface BlockEditorProps {
  value: any[]
  onChange: (value: any[]) => void
}

export function BlockEditor({ value, onChange }: BlockEditorProps) {
  return (
    <Box>
      <PortableText
        value={value}
        components={{
          block: {
            normal: ({children}) => <Box padding={3}>{children}</Box>
          }
        }}
      />
    </Box>
  )
} 
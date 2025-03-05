import { useState } from 'react'
import { TextArea } from '@sanity/ui'
import { set, unset } from 'sanity'

export function BulkMethodInput(props: any) {
  const { onChange, value } = props
  const [text, setText] = useState('')

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value
    setText(pastedText)

    // Parse the pasted text
    const methods = pastedText.split('\n\n').filter(Boolean).map((block, index) => {
      const lines = block.split('\n')
      const firstLine = lines[0]
      
      // Split the first line by multiple spaces to separate name and type
      const parts = firstLine.split(/\s{2,}/)
      const name = parts[0].trim()
      const typeInfo = parts[1] ? parts[1].trim() : ''
      
      const timestamp = Date.now()
      const uniqueKey = `${timestamp}-${index}`
      
      return {
        _type: 'object',
        _key: uniqueKey,
        name: name,
        arguments: typeInfo || 'None',
        description: [{
          _type: 'block',
          _key: `${uniqueKey}-desc`,
          style: 'normal',
          children: [{
            _type: 'span',
            _key: `${uniqueKey}-span`,
            text: lines.slice(1).join(' ').trim(),
            marks: []
          }],
          markDefs: []
        }]
      }
    })

    // Update the value in Sanity
    onChange(methods.length ? set(methods) : unset())
  }

  return (
    <TextArea
      value={text}
      onChange={handlePaste}
      rows={10}
      placeholder={`Paste your properties here in the format:
address    PublicKey
The public key or address of the bank

tokenSymbol    string | undefined
The symbol or ticker of the token associated with the bank

group    PublicKey
The public key of the group that the bank belongs to`}
    />
  )
} 
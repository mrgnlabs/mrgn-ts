'use client'

import { useState } from 'react'
import { TextArea, Stack, Text } from '@sanity/ui'
import { set, unset } from 'sanity'

interface Parameter {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
}

export function DetailedMethodInput(props: any) {
  const { onChange } = props
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parseParameters = (paramText: string): Parameter[] => {
    if (!paramText) return [];
    return paramText.split('\n').map(line => {
      const [nameAndType, ...descParts] = line.split(' - ')
      const [name, type] = nameAndType.split(': ')
      const description = descParts.join(' - ').trim()
      const optional = type.includes('?') || type.includes('optional')
      
      return {
        name: name.trim(),
        type: type.replace('?', '').trim(),
        description,
        optional
      }
    })
  }

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value
    setText(pastedText)
    setError(null)

    try {
      const lines = pastedText.split('\n')
      const name = lines[0].split('(')[0].trim()
      const description = lines[1]?.trim()
      
      // Find sections
      const paramStart = lines.findIndex(l => l.includes('Parameters:'))
      const returnsStart = lines.findIndex(l => l.includes('Returns:'))
      const notesStart = lines.findIndex(l => l.includes('Notes:'))
      
      let parameters: Parameter[] = []
      if (paramStart !== -1) {
        const paramEnd = returnsStart !== -1 ? returnsStart : (notesStart !== -1 ? notesStart : lines.length)
        const paramText = lines.slice(paramStart + 1, paramEnd).join('\n').trim()
        parameters = parseParameters(paramText)
      }

      const value = {
        _type: 'detailedMethod',
        name,
        description,
        parameters,
        returns: returnsStart !== -1 ? lines[returnsStart + 1]?.trim() : undefined,
        notes: notesStart !== -1 ? lines.slice(notesStart + 1).join('\n').trim() : undefined
      }

      onChange(value ? set(value) : unset())
    } catch (err) {
      setError('Error parsing the input. Please check the format and try again.')
      console.error(err)
    }
  }

  const placeholder = `makeDepositIx
Creates instructions for depositing assets into a Marginfi account.

Parameters:
amount: Amount - The amount of the asset to deposit
bankAddress: PublicKey - The address of the bank where the asset is being deposited
opt?: MakeDepositIxOpts - Additional options for creating the deposit instruction

Returns: Promise<InstructionsWrapper>

Notes: This method delegates the creation of deposit instructions to the internal _marginfiAccount object.`

  return (
    <Stack space={3}>
      <TextArea
        value={text}
        onChange={handlePaste}
        rows={10}
        placeholder={placeholder}
      />

      {error && (
        <Text style={{ color: 'red' }}>
          {error}
        </Text>
      )}
    </Stack>
  )
} 
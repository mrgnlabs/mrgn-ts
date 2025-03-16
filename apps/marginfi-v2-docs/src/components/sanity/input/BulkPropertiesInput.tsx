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

interface MethodDoc {
  _type: 'object';
  _key: string;
  name: string;
  description?: string;
  parameters?: Parameter[];
  parametersString?: string;
  resultType?: string;
  returns?: string;
  notes?: string;
}

const MAX_ITEMS_PER_CHUNK = 10; // Limiting to 10 items per chunk to stay well under the 1000 attribute limit

export function BulkPropertiesInput(props: any) {
  const { onChange, value } = props
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const format = value?.format || 'table'

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

  const parseDetailedMethod = (block: string): MethodDoc => {
    const lines = block.split('\n')
    const name = lines[0].split('(')[0].trim()
    const description = lines[1]?.trim()
    
    // Find parameters section
    const paramStart = lines.findIndex(l => l.includes('Parameters:'))
    const returnsStart = lines.findIndex(l => l.includes('Returns:'))
    const notesStart = lines.findIndex(l => l.includes('Notes:'))
    
    let parameters: Parameter[] = []
    if (paramStart !== -1) {
      const paramEnd = returnsStart !== -1 ? returnsStart : (notesStart !== -1 ? notesStart : lines.length)
      const paramText = lines.slice(paramStart + 1, paramEnd).join('\n').trim()
      parameters = parseParameters(paramText)
    }

    const timestamp = Date.now()
    return {
      _type: 'object',
      _key: `${timestamp}`,
      name,
      description,
      parameters,
      returns: returnsStart !== -1 ? lines[returnsStart + 1]?.trim() : undefined,
      notes: notesStart !== -1 ? lines.slice(notesStart + 1).join('\n').trim() : undefined
    }
  }

  const parseTableMethod = (block: string): MethodDoc => {
    const lines = block.split('\n')
    const [nameAndParams, resultType, ...descLines] = lines
    const [name, params] = nameAndParams.split('(')
    
    return {
      _type: 'object',
      _key: `${Date.now()}`,
      name: name.trim(),
      parametersString: params ? params.replace(')', '').trim() : '',
      resultType: resultType?.trim() || '',
      description: descLines.join('\n').trim()
    }
  }

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value
    setText(pastedText)
    setError(null)

    try {
      const blocks = pastedText.split('\n\n').filter(Boolean)
      
      // If there are too many items, show a warning
      if (blocks.length > MAX_ITEMS_PER_CHUNK) {
        setError(`Please paste ${MAX_ITEMS_PER_CHUNK} or fewer items at a time to avoid exceeding Sanity's limits.`)
        return
      }

      const methods = blocks.map(block => 
        format === 'detailed' ? parseDetailedMethod(block) : parseTableMethod(block)
      )

      // Update the value in Sanity
      onChange(methods.length ? set({ 
        _type: 'properties',
        format, 
        items: methods 
      }) : unset())
    } catch (err) {
      setError('Error parsing the input. Please check the format and try again.')
      console.error(err)
    }
  }

  const detailedPlaceholder = `makeDepositIx
Creates instructions for depositing assets into a Marginfi account.

Parameters:
amount: Amount - The amount of the asset to deposit
bankAddress: PublicKey - The address of the bank where the asset is being deposited
opt?: MakeDepositIxOpts - Additional options for creating the deposit instruction

Returns: Promise<InstructionsWrapper>

Notes: This method delegates the creation of deposit instructions to the internal _marginfiAccount object.`

  const tablePlaceholder = `from(balanceRaw: BalanceRaw)
Balance
A static method that creates a new Balance instance from a BalanceRaw object.

createEmpty(bankPk: PublicKey)
Balance
A static method that creates a new empty Balance instance with the given bank public key.`

  return (
    <Stack space={3}>
      <TextArea
        value={text}
        onChange={handlePaste}
        rows={10}
        placeholder={format === 'detailed' ? detailedPlaceholder : tablePlaceholder}
      />

      {error && (
        <Text style={{ color: 'red' }}>
          {error}
        </Text>
      )}

      <Text size={1} style={{ color: '#666' }}>
        Note: Please paste up to {MAX_ITEMS_PER_CHUNK} methods at a time. For larger sets, create multiple Properties blocks.
      </Text>
    </Stack>
  )
} 
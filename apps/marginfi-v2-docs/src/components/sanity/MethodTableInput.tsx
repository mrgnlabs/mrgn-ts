import { useState } from 'react'
import { TextArea, Stack, Text } from '@sanity/ui'
import { set, unset } from 'sanity'

interface Method {
  _type: 'object';
  _key: string;
  name: string;
  parametersString: string;
  resultType: string;
  description: string;
}

const MAX_ITEMS = 10;

export function MethodTableInput(props: any) {
  const { onChange } = props
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value
    setText(pastedText)
    setError(null)

    try {
      const blocks = pastedText.split('\n\n').filter(Boolean)
      
      if (blocks.length > MAX_ITEMS) {
        setError(`Please paste ${MAX_ITEMS} or fewer methods at a time.`)
        return
      }

      const methods = blocks.map(block => {
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
      })

      onChange(methods.length ? set({
        _type: 'methodTable',
        methods
      }) : unset())
    } catch (err) {
      setError('Error parsing the input. Please check the format and try again.')
      console.error(err)
    }
  }

  const placeholder = `from(balanceRaw: BalanceRaw)
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
        placeholder={placeholder}
      />

      {error && (
        <Text style={{ color: 'red' }}>
          {error}
        </Text>
      )}

      <Text size={1} style={{ color: '#666' }}>
        Note: Please paste up to {MAX_ITEMS} methods at a time.
      </Text>
    </Stack>
  )
} 
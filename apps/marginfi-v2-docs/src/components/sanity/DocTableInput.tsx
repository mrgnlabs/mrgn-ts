import React from 'react'
import { ObjectInputProps, set, unset } from 'sanity'
import { Stack, Text, Card, Button, Box, TextInput, TextArea } from '@sanity/ui'
import { AddIcon, TrashIcon } from '@sanity/icons'

interface DocTableItem {
  _type: string;
  name: string;
  parameters: string;
  resultType: string;
  description: string;
}

export function DocTableInput(props: ObjectInputProps) {
  const { value, onChange, schemaType } = props

  const handleAddItem = () => {
    const currentItems = (value?.items || []) as DocTableItem[]
    onChange(
      set([
        ...currentItems,
        {
          _type: 'docTableItem',
          name: '',
          parameters: '',
          resultType: '',
          description: ''
        }
      ], ['items'])
    )
  }

  const handleRemoveItem = (index: number) => {
    const currentItems = (value?.items || []) as DocTableItem[]
    const newItems = currentItems.filter((_: DocTableItem, i: number) => i !== index)
    onChange(set(newItems, ['items']))
  }

  const handleItemChange = (index: number, field: string, newValue: string) => {
    const currentItems = (value?.items || []) as DocTableItem[]
    const newItems = currentItems.map((item: DocTableItem, i: number) => 
      i === index ? { ...item, [field]: newValue } : item
    )
    onChange(set(newItems, ['items']))
  }

  const handleTitleChange = (newTitle: string) => {
    onChange(set(newTitle, ['title']))
  }

  return (
    <Stack space={4}>
      <Text size={1} weight="semibold">Properties Table</Text>
      
      {/* Title Input */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Table Title</Text>
        <TextInput
          value={value?.title || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(event.currentTarget.value)}
          placeholder="E.g., 'Properties' or 'Parameters'"
        />
      </Box>

      {/* Items List */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Properties</Text>
        {((value?.items || []) as DocTableItem[]).map((item, index) => (
          <Card key={index} padding={3} marginBottom={2} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Box>
                <Text size={1} weight="medium">Name</Text>
                <TextInput
                  value={item.name || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'name', event.currentTarget.value)}
                  placeholder="Property name"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Parameters</Text>
                <TextInput
                  value={item.parameters || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'parameters', event.currentTarget.value)}
                  placeholder="e.g., 'string | number'"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Result Type</Text>
                <TextInput
                  value={item.resultType || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'resultType', event.currentTarget.value)}
                  placeholder="e.g., 'Promise<string>'"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Description</Text>
                <TextArea
                  value={item.description || ''}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleItemChange(index, 'description', event.currentTarget.value)}
                  placeholder="Detailed description"
                  rows={4}
                />
              </Box>
              <Button
                icon={TrashIcon}
                tone="critical"
                onClick={() => handleRemoveItem(index)}
                text="Remove Item"
              />
            </Stack>
          </Card>
        ))}
        <Button
          icon={AddIcon}
          onClick={handleAddItem}
          text="Add Item"
          tone="primary"
          style={{ marginTop: '1rem' }}
        />
      </Box>
    </Stack>
  )
} 
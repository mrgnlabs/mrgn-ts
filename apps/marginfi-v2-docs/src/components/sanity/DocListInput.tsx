import React from 'react'
import { ObjectInputProps, set, unset } from 'sanity'
import { Stack, Text, Card, Button, Box, TextInput, TextArea } from '@sanity/ui'
import { AddIcon, TrashIcon } from '@sanity/icons'

interface DocListItem {
  _type: string;
  name: string;
  arguments: string;
  description: string;
}

export function DocListInput(props: ObjectInputProps) {
  const { value, onChange, schemaType } = props

  const handleAddItem = () => {
    const currentItems = (value?.items || []) as DocListItem[]
    onChange(
      set([
        ...currentItems,
        {
          _type: 'docListItem',
          name: '',
          arguments: '',
          description: ''
        }
      ], ['items'])
    )
  }

  const handleRemoveItem = (index: number) => {
    const currentItems = (value?.items || []) as DocListItem[]
    const newItems = currentItems.filter((_: DocListItem, i: number) => i !== index)
    onChange(set(newItems, ['items']))
  }

  const handleItemChange = (index: number, field: string, newValue: string) => {
    const currentItems = (value?.items || []) as DocListItem[]
    const newItems = currentItems.map((item: DocListItem, i: number) => 
      i === index ? { ...item, [field]: newValue } : item
    )
    onChange(set(newItems, ['items']))
  }

  const handleTitleChange = (newTitle: string) => {
    onChange(set(newTitle, ['title']))
  }

  return (
    <Stack space={4}>
      <Text size={1} weight="semibold">Documentation List</Text>
      
      {/* Title Input */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>List Title</Text>
        <TextInput
          value={value?.title || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(event.currentTarget.value)}
          placeholder="E.g., 'User Actions' or 'Methods'"
        />
      </Box>

      {/* Items List */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Items</Text>
        {((value?.items || []) as DocListItem[]).map((item, index) => (
          <Card key={index} padding={3} marginBottom={2} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Box>
                <Text size={1} weight="medium">Name</Text>
                <TextInput
                  value={item.name || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'name', event.currentTarget.value)}
                  placeholder="Method or action name"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Arguments</Text>
                <TextInput
                  value={item.arguments || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'arguments', event.currentTarget.value)}
                  placeholder="e.g., '(authority: PublicKey)'"
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
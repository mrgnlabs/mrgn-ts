import React from 'react'
import { ObjectInputProps, set, unset } from 'sanity'
import { Stack, Text, Card, Button, Box, TextInput } from '@sanity/ui'
import { AddIcon, TrashIcon } from '@sanity/icons'

interface SimpleProperty {
  name: string;
  type: string;
  description: string;
}

export function SimplePropertiesInput(props: ObjectInputProps) {
  const { value, onChange } = props

  const handleAddItem = () => {
    const currentItems = (value?.items || []) as SimpleProperty[]
    onChange(
      set([
        ...currentItems,
        {
          name: '',
          type: '',
          description: ''
        }
      ], ['items'])
    )
  }

  const handleRemoveItem = (index: number) => {
    const currentItems = (value?.items || []) as SimpleProperty[]
    const newItems = currentItems.filter((_: SimpleProperty, i: number) => i !== index)
    onChange(set(newItems, ['items']))
  }

  const handleItemChange = (index: number, field: string, newValue: string) => {
    const currentItems = (value?.items || []) as SimpleProperty[]
    const newItems = currentItems.map((item: SimpleProperty, i: number) => 
      i === index ? { ...item, [field]: newValue } : item
    )
    onChange(set(newItems, ['items']))
  }

  const handleTitleChange = (newTitle: string) => {
    onChange(set(newTitle, ['title']))
  }

  return (
    <Stack space={4}>
      <Text size={1} weight="semibold">Simple Properties</Text>
      
      {/* Title Input */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Section Title</Text>
        <TextInput
          value={value?.title || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(event.currentTarget.value)}
          placeholder="E.g., 'Utilities' or 'Constants'"
        />
      </Box>

      {/* Properties List */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Properties</Text>
        {((value?.items || []) as SimpleProperty[]).map((item, index) => (
          <Card key={index} padding={3} marginBottom={2} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              <Box>
                <Text size={1} weight="medium">Property Name</Text>
                <TextInput
                  value={item.name || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                    handleItemChange(index, 'name', event.currentTarget.value)
                  }
                  placeholder="Property name"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Type</Text>
                <TextInput
                  value={item.type || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                    handleItemChange(index, 'type', event.currentTarget.value)
                  }
                  placeholder="Property type"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Description</Text>
                <TextInput
                  value={item.description || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                    handleItemChange(index, 'description', event.currentTarget.value)
                  }
                  placeholder="Property description"
                />
              </Box>
              <Button
                icon={TrashIcon}
                tone="critical"
                onClick={() => handleRemoveItem(index)}
                text="Remove Property"
              />
            </Stack>
          </Card>
        ))}
        <Button
          icon={AddIcon}
          onClick={handleAddItem}
          text="Add Property"
          tone="primary"
          style={{ marginTop: '1rem' }}
        />
      </Box>
    </Stack>
  )
} 
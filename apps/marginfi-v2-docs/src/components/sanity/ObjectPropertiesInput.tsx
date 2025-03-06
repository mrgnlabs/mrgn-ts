import React from 'react'
import { ObjectInputProps, set, unset } from 'sanity'
import { Stack, Text, Card, Button, Box, TextInput } from '@sanity/ui'
import { AddIcon, TrashIcon } from '@sanity/icons'

interface SubProperty {
  name: string;
  type: string;
  description: string;
}

interface ObjectProperty {
  name: string;
  type: string;
  description: string;
  subProperties: SubProperty[];
}

export function ObjectPropertiesInput(props: ObjectInputProps) {
  const { value, onChange } = props

  const handleAddItem = () => {
    const currentItems = (value?.items || []) as ObjectProperty[]
    onChange(
      set([
        ...currentItems,
        {
          name: '',
          type: '',
          description: '',
          subProperties: []
        }
      ], ['items'])
    )
  }

  const handleRemoveItem = (index: number) => {
    const currentItems = (value?.items || []) as ObjectProperty[]
    const newItems = currentItems.filter((_: ObjectProperty, i: number) => i !== index)
    onChange(set(newItems, ['items']))
  }

  const handleItemChange = (index: number, field: string, newValue: any) => {
    const currentItems = (value?.items || []) as ObjectProperty[]
    const newItems = currentItems.map((item: ObjectProperty, i: number) => 
      i === index ? { ...item, [field]: newValue } : item
    )
    onChange(set(newItems, ['items']))
  }

  const handleAddSubProperty = (propertyIndex: number) => {
    const currentItems = (value?.items || []) as ObjectProperty[]
    const currentProperty = currentItems[propertyIndex]
    const newSubProperties = [
      ...(currentProperty.subProperties || []),
      { name: '', type: '', description: '' }
    ]
    handleItemChange(propertyIndex, 'subProperties', newSubProperties)
  }

  const handleRemoveSubProperty = (propertyIndex: number, subPropertyIndex: number) => {
    const currentItems = (value?.items || []) as ObjectProperty[]
    const currentProperty = currentItems[propertyIndex]
    const newSubProperties = currentProperty.subProperties.filter((_, i) => i !== subPropertyIndex)
    handleItemChange(propertyIndex, 'subProperties', newSubProperties)
  }

  const handleSubPropertyChange = (propertyIndex: number, subPropertyIndex: number, field: string, newValue: string) => {
    const currentItems = (value?.items || []) as ObjectProperty[]
    const currentProperty = currentItems[propertyIndex]
    const newSubProperties = currentProperty.subProperties.map((subProp, i) => 
      i === subPropertyIndex ? { ...subProp, [field]: newValue } : subProp
    )
    handleItemChange(propertyIndex, 'subProperties', newSubProperties)
  }

  const handleTitleChange = (newTitle: string) => {
    onChange(set(newTitle, ['title']))
  }

  return (
    <Stack space={4}>
      <Text size={1} weight="semibold">Object Properties</Text>
      
      {/* Title Input */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Section Title</Text>
        <TextInput
          value={value?.title || ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(event.currentTarget.value)}
          placeholder="E.g., 'Bank Properties' or 'Class Properties'"
        />
      </Box>

      {/* Properties List */}
      <Box>
        <Text size={1} weight="medium" style={{ marginBottom: '0.5rem' }}>Properties</Text>
        {((value?.items || []) as ObjectProperty[]).map((item, propertyIndex) => (
          <Card key={propertyIndex} padding={3} marginBottom={2} radius={2} shadow={1} tone="default">
            <Stack space={3}>
              {/* Property Fields */}
              <Box>
                <Text size={1} weight="medium">Property Name</Text>
                <TextInput
                  value={item.name || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                    handleItemChange(propertyIndex, 'name', event.currentTarget.value)
                  }
                  placeholder="Property name"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Type</Text>
                <TextInput
                  value={item.type || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                    handleItemChange(propertyIndex, 'type', event.currentTarget.value)
                  }
                  placeholder="Property type"
                />
              </Box>
              <Box>
                <Text size={1} weight="medium">Description</Text>
                <TextInput
                  value={item.description || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                    handleItemChange(propertyIndex, 'description', event.currentTarget.value)
                  }
                  placeholder="Property description"
                />
              </Box>

              {/* Sub-Properties */}
              <Box>
                <Text size={1} weight="medium">Sub-Properties</Text>
                {(item.subProperties || []).map((subProp, subPropIndex) => (
                  <Card key={subPropIndex} padding={2} marginBottom={2} radius={2} shadow={1} tone="default">
                    <Stack space={2}>
                      <TextInput
                        value={subProp.name || ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                          handleSubPropertyChange(propertyIndex, subPropIndex, 'name', event.currentTarget.value)
                        }
                        placeholder="Sub-property name"
                      />
                      <TextInput
                        value={subProp.type || ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                          handleSubPropertyChange(propertyIndex, subPropIndex, 'type', event.currentTarget.value)
                        }
                        placeholder="Sub-property type"
                      />
                      <TextInput
                        value={subProp.description || ''}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => 
                          handleSubPropertyChange(propertyIndex, subPropIndex, 'description', event.currentTarget.value)
                        }
                        placeholder="Sub-property description"
                      />
                      <Button
                        icon={TrashIcon}
                        tone="critical"
                        onClick={() => handleRemoveSubProperty(propertyIndex, subPropIndex)}
                        text="Remove Sub-Property"
                      />
                    </Stack>
                  </Card>
                ))}
                <Button
                  icon={AddIcon}
                  onClick={() => handleAddSubProperty(propertyIndex)}
                  text="Add Sub-Property"
                  tone="primary"
                  style={{ marginTop: '1rem' }}
                />
              </Box>

              <Button
                icon={TrashIcon}
                tone="critical"
                onClick={() => handleRemoveItem(propertyIndex)}
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
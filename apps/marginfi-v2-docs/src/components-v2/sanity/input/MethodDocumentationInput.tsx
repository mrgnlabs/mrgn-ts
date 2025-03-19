'use client'

import { useCallback } from 'react'
import { Stack, Card, Text, TextInput, Select, Button, Box } from '@sanity/ui'
import { set, unset, FormPatch, PatchEvent } from 'sanity'
import { BlockEditor } from './BlockEditor'

interface Method {
  _key: string
  name: string
  description: any[]
  parameters: Parameter[]
  parametersString?: string
  returnType: string
  notes: any[]
}

interface Parameter {
  _key: string
  name: string
  type: string
  description: any[]
  optional: boolean
}

interface MethodDocumentationInputProps {
  value?: {
    format?: 'detailed' | 'table' | 'properties'
    title?: string
    methods?: Method[]
  }
  onChange: (patch: FormPatch | PatchEvent | FormPatch[]) => void
  type: any
}

export function MethodDocumentationInput(props: MethodDocumentationInputProps) {
  const { value, onChange, type } = props

  const handleFormatChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newFormat = event.currentTarget.value
      onChange(set(newFormat, ['format']))
    },
    [onChange]
  )

  const handleMethodAdd = useCallback(() => {
    const newMethod: Method = {
      _key: Date.now().toString(),
      name: '',
      description: [],
      parameters: [],
      returnType: '',
      notes: []
    }
    onChange(set([...(value?.methods || []), newMethod], ['methods']))
  }, [onChange, value?.methods])

  const handleMethodRemove = useCallback(
    (index: number) => {
      const newMethods = [...(value?.methods || [])]
      newMethods.splice(index, 1)
      onChange(set(newMethods, ['methods']))
    },
    [onChange, value?.methods]
  )

  const handleMethodChange = useCallback(
    (index: number, field: string, newValue: any) => {
      const newMethods = [...(value?.methods || [])]
      newMethods[index] = { ...newMethods[index], [field]: newValue }
      onChange(set(newMethods, ['methods']))
    },
    [onChange, value?.methods]
  )

  return (
    <Stack space={4}>
      <Card padding={4}>
        <Stack space={4}>
          <Select
            value={value?.format || 'detailed'}
            onChange={handleFormatChange}
          >
            <option value="detailed">Detailed Method</option>
            <option value="table">Method Table</option>
            <option value="properties">Properties List</option>
          </Select>

          <TextInput
            value={value?.title || ''}
            onChange={(event) => onChange(set(event.currentTarget.value, ['title']))}
            placeholder="Section Title"
          />
        </Stack>
      </Card>

      <Stack space={4}>
        {value?.methods?.map((method: Method, index: number) => (
          <Card key={method._key} padding={4} border radius={2}>
            <Stack space={4}>
              <Box>
                <TextInput
                  value={method.name}
                  onChange={(event) =>
                    handleMethodChange(index, 'name', event.currentTarget.value)
                  }
                  placeholder="Method Name"
                />
              </Box>

              <Box>
                <Text weight="semibold" size={1}>Description</Text>
                <BlockEditor
                  value={method.description}
                  onChange={(newValue) =>
                    handleMethodChange(index, 'description', newValue)
                  }
                />
              </Box>

              {value?.format !== 'table' && (
                <Box>
                  <Text weight="semibold" size={1}>Parameters</Text>
                  {method.parameters?.map((param: Parameter, paramIndex: number) => (
                    <Card key={param._key} padding={2} marginTop={2}>
                      <Stack space={2}>
                        <TextInput
                          value={param.name}
                          onChange={(event) => {
                            const newParams = [...method.parameters]
                            newParams[paramIndex] = {
                              ...param,
                              name: event.currentTarget.value
                            }
                            handleMethodChange(index, 'parameters', newParams)
                          }}
                          placeholder="Parameter Name"
                        />
                        <TextInput
                          value={param.type}
                          onChange={(event) => {
                            const newParams = [...method.parameters]
                            newParams[paramIndex] = {
                              ...param,
                              type: event.currentTarget.value
                            }
                            handleMethodChange(index, 'parameters', newParams)
                          }}
                          placeholder="Parameter Type"
                        />
                        <BlockEditor
                          value={param.description}
                          onChange={(newValue) => {
                            const newParams = [...method.parameters]
                            newParams[paramIndex] = {
                              ...param,
                              description: newValue
                            }
                            handleMethodChange(index, 'parameters', newParams)
                          }}
                        />
                      </Stack>
                    </Card>
                  ))}
                  <Button
                    mode="ghost"
                    tone="primary"
                    onClick={() => {
                      const newParam: Parameter = {
                        _key: Date.now().toString(),
                        name: '',
                        type: '',
                        description: [],
                        optional: false
                      }
                      handleMethodChange(index, 'parameters', [
                        ...(method.parameters || []),
                        newParam
                      ])
                    }}
                    text="Add Parameter"
                  />
                </Box>
              )}

              {value?.format === 'table' && (
                <Box>
                  <TextInput
                    value={method.parametersString}
                    onChange={(event) =>
                      handleMethodChange(
                        index,
                        'parametersString',
                        event.currentTarget.value
                      )
                    }
                    placeholder="Parameters (comma-separated)"
                  />
                </Box>
              )}

              <Box>
                <TextInput
                  value={method.returnType}
                  onChange={(event) =>
                    handleMethodChange(index, 'returnType', event.currentTarget.value)
                  }
                  placeholder="Return Type"
                />
              </Box>

              {value?.format !== 'table' && (
                <Box>
                  <Text weight="semibold" size={1}>Notes</Text>
                  <BlockEditor
                    value={method.notes}
                    onChange={(newValue) =>
                      handleMethodChange(index, 'notes', newValue)
                    }
                  />
                </Box>
              )}

              <Button
                mode="ghost"
                tone="critical"
                onClick={() => handleMethodRemove(index)}
                text="Remove Method"
              />
            </Stack>
          </Card>
        ))}

        <Button
          mode="ghost"
          tone="primary"
          onClick={handleMethodAdd}
          text="Add Method"
        />
      </Stack>
    </Stack>
  )
} 
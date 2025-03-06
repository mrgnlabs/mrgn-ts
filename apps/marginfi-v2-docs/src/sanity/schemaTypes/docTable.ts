import { defineType, defineField } from 'sanity'
import { DocTableInput } from '~/components/sanity/DocTableInput'

export const docTable = defineType({
  name: 'docTable',
  title: 'Properties Table',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Table Title',
      type: 'string',
      description: 'E.g., "Properties" or "Parameters"',
    }),
    defineField({
      name: 'items',
      title: 'Properties',
      type: 'array',
      of: [{
        type: 'object',
        name: 'docTableItem',
        fields: [
          {
            name: 'name',
            title: 'Name',
            type: 'string',
            description: 'Property name',
          },
          {
            name: 'parameters',
            title: 'Parameters',
            type: 'string',
            description: 'Parameter type (e.g., "string | number")',
          },
          {
            name: 'resultType',
            title: 'Result Type',
            type: 'string',
            description: 'Return type(s) (e.g., "Promise<string>")',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'text',
            description: 'Detailed description of the property',
          }
        ]
      }]
    })
  ],
  components: {
    input: DocTableInput
  }
}) 
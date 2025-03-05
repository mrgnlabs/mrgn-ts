import { defineType, defineField } from 'sanity'
import { MethodTableInput } from '~/components/sanity/MethodTableInput'

export const methodTable = defineType({
  name: 'methodTable',
  title: 'Method Table',
  type: 'object',
  fields: [
    defineField({
      name: 'methods',
      title: 'Methods',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'name',
            title: 'Method Name',
            type: 'string',
          },
          {
            name: 'parametersString',
            title: 'Parameters',
            type: 'string',
          },
          {
            name: 'resultType',
            title: 'Result Type',
            type: 'string',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'text',
          }
        ]
      }]
    })
  ],
  components: {
    input: MethodTableInput
  }
}) 
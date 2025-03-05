import { defineType, defineField } from 'sanity'
import { DetailedMethodInput } from '~/components/sanity/DetailedMethodInput'

export const detailedMethod = defineType({
  name: 'detailedMethod',
  title: 'Detailed Method',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      title: 'Method Name',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'parameters',
      title: 'Parameters',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string', title: 'Parameter Name' },
          { name: 'type', type: 'string', title: 'Parameter Type' },
          { name: 'description', type: 'text', title: 'Description' },
          { name: 'optional', type: 'boolean', title: 'Optional' }
        ]
      }]
    }),
    defineField({
      name: 'returns',
      title: 'Returns',
      type: 'string',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
    })
  ],
  components: {
    input: DetailedMethodInput
  }
}) 
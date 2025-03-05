import { defineType, defineField } from 'sanity'
import { BulkMethodInput } from '~/components/sanity/BulkMethodInput'

export const methodList = defineType({
  name: 'methodList',
  title: 'Method List',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'E.g., "Attributes", "Methods", etc.',
    }),
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
            name: 'arguments',
            title: 'Arguments',
            type: 'string',
            description: 'E.g., "Argument(s): None", "Argument(s): pubkeys"',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{title: 'Normal', value: 'normal'}],
                marks: {
                  decorators: [
                    {title: 'Strong', value: 'strong'},
                    {title: 'Emphasis', value: 'em'},
                    {title: 'Code', value: 'code'},
                  ],
                },
              },
            ],
          },
        ],
      }],
      components: {
        input: BulkMethodInput
      }
    }),
  ],
}) 
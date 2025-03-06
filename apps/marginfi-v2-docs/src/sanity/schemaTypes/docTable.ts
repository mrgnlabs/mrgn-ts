import { defineType, defineField } from 'sanity'

export const docTable = defineType({
  name: 'docTable',
  title: 'Method Table',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Table Title',
      type: 'string',
      description: 'E.g., "Methods" or "Functions"',
    }),
    defineField({
      name: 'items',
      title: 'Methods',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'name',
            title: 'Method Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'parametersString',
            title: 'Parameters',
            type: 'string',
            description: 'Parameter list (e.g., "encoded: Buffer")',
          },
          {
            name: 'resultType',
            title: 'Result Type',
            type: 'string',
            description: 'Return type (e.g., "BankRaw")',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{ title: 'Normal', value: 'normal' }],
                lists: [
                  { title: 'Bullet', value: 'bullet' },
                  { title: 'Number', value: 'number' }
                ],
                marks: {
                  decorators: [
                    { title: 'Strong', value: 'strong' },
                    { title: 'Emphasis', value: 'em' },
                    { title: 'Code', value: 'code' }
                  ]
                }
              }
            ]
          }
        ],
        preview: {
          select: {
            title: 'name',
            subtitle: 'resultType'
          }
        }
      }]
    })
  ]
}) 
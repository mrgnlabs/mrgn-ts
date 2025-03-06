import { defineType, defineField } from 'sanity'
import { DocListInput } from '~/components/sanity/DocListInput'

export const docList = defineType({
  name: 'docList',
  title: 'Documentation List',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'List Title',
      type: 'string',
      description: 'E.g., "User Actions" or "Methods"',
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        name: 'docListItem',
        fields: [
          {
            name: 'name',
            title: 'Name',
            type: 'string',
            description: 'Method or action name',
          },
          {
            name: 'arguments',
            title: 'Arguments',
            type: 'string',
            description: 'Method arguments (e.g., "(authority: PublicKey)")',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'text',
            description: 'Detailed description of what this method/action does',
          }
        ]
      }]
    })
  ],
  components: {
    input: DocListInput
  }
}) 
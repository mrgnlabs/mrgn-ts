import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'faq',
  title: 'FAQs',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'tag',
      title: 'Tag',
      type: 'string',
      description: 'Optional tag for categorization (e.g., lending, borrowing)',
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Optional label for UI purposes',
    }),
  ],
})
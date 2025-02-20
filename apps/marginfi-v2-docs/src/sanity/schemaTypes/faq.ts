// src/sanity/schema/faq.ts
import { defineType, defineField } from 'sanity'

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'FAQs',
    }),
    defineField({
      name: 'questions',
      title: 'FAQ Items',
      type: 'array',
      of: [
        defineField({
          name: 'faqItem',
          title: 'FAQ Item',
          type: 'object',
          fields: [
            {
              name: 'question',
              title: 'Question',
              type: 'string',
            },
            {
              name: 'answer',
              title: 'Answer',
              // Use a Portable Text array so you can style it with headings, paragraphs, etc.
              type: 'array',
              of: [{ type: 'block' }],
            },
            {
              name: 'tag',
              title: 'Tag',
              type: 'string',
            },
            {
              name: 'label',
              title: 'Label',
              type: 'string',
            },
          ],
        }),
      ],
    }),
  ],
})
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
      name: 'description',
      title: 'Description',
      type: 'text',
      initialValue:
        'In this guide, we will answer commonly asked questions regarding the marginfi protocol.',
    }),
    defineField({
      name: 'questions',
      title: 'FAQ Items',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'faqItem',
          title: 'FAQ Item',
          preview: {
            select: {
              title: 'question',
            },
          },
          fields: [
            { name: 'question', title: 'Question', type: 'string' },
            {
              name: 'answer',
              title: 'Answer',
              type: 'array',
              of: [{ type: 'block' }],
            },
            { name: 'tag', title: 'Tag', type: 'string' },
            { name: 'label', title: 'Label', type: 'string' },
          ],
        },
      ],
    }),
  ],
  // Optional: If you want the doc list to show "FAQs" or whatever is in the `title` field
  // preview: {
  //   select: {
  //     title: 'title',
  //   },
  // },
})

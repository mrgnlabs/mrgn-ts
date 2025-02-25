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
            { 
              name: 'question', 
              title: 'Question', 
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'answer',
              title: 'Answer',
              type: 'array',
              of: [
                {
                  type: 'block',
                  // Add styles and marks for rich text formatting
                  styles: [
                    {title: 'Normal', value: 'normal'},
                    {title: 'Lead', value: 'lead'},
                  ],
                  marks: {
                    decorators: [
                      {title: 'Strong', value: 'strong'},
                      {title: 'Emphasis', value: 'em'},
                      {title: 'Code', value: 'code'},
                    ],
                    annotations: [
                      {
                        name: 'link',
                        type: 'object',
                        title: 'Link',
                        fields: [
                          {
                            name: 'href',
                            type: 'url',
                            title: 'URL',
                            validation: (Rule: any) => Rule.required(),
                          },
                          {
                            name: 'variant',
                            type: 'string',
                            initialValue: 'text',
                            options: {
                              list: [
                                {title: 'Text', value: 'text'},
                                {title: 'Primary', value: 'primary'},
                                {title: 'Secondary', value: 'secondary'},
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
              validation: (Rule: any) => Rule.required(),
            },
            { 
              name: 'tag', 
              title: 'Tag', 
              type: 'string',
              description: 'Optional tag for categorizing questions',
            },
            { 
              name: 'label', 
              title: 'Label', 
              type: 'string',
              description: 'Optional label for additional context',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
    },
  },
})

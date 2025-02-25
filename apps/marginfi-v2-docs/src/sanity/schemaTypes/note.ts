import { defineType, defineField } from 'sanity'

export const note = defineType({
  name: 'note',
  title: 'Note',
  type: 'object',
  fields: [
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
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
                  },
                  {
                    name: 'variant',
                    type: 'string',
                    initialValue: 'text',
                  },
                ],
              },
            ],
          },
        },
      ],
    }),
  ],
}) 
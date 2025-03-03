import { defineType, defineField } from 'sanity'

export const section = defineType({
  name: 'section',
  title: 'Section',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    }),
    defineField({
      name: 'tag',
      title: 'Tag',
      type: 'string',
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Lead', value: 'lead'},
            {title: 'H1', value: 'h1'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Number', value: 'number'},
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
        { type: 'note' },
        { type: 'mathBlock' },
        { type: 'imageWithCaption' },
        { type: 'properties' },
        { type: 'codeBlock' },
      ],
    }),
  ],
})
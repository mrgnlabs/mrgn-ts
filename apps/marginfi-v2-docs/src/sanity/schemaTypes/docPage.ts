// src/sanity/schema/docPage.ts
import { defineType, defineField } from 'sanity'

export const docPage = defineType({
  name: 'docPage',
  title: 'Documentation Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
      },
      validation: (Rule) => Rule.required(),
    }),
    // defineField({
    //   name: 'description',
    //   title: 'Description',
    //   type: 'text',
    // }),
    defineField({
      name: 'leadText',
      title: 'Lead Text',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Lead', value: 'lead'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
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
                  },
                  {
                    name: 'variant',
                    type: 'string',
                    title: 'Button Variant',
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
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        { type: 'section' },
        { type: 'note' },
        { type: 'mathBlock' },
        { type: 'imageWithCaption' },
        { type: 'detailedMethod' },
        { type: 'codeBlock' },
        { type: 'methodList' },
        { type: 'docTable' },
        { type: 'docList' },
        { type: 'methodProperties' },
        { type: 'simpleProperties' },
        { type: 'objectProperties' }
      ],
    }),
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'object',
      fields: [
        {
          name: 'title',
          title: 'Meta Title',
          type: 'string',
          validation: (Rule) => Rule.required(),
        },
        {
          name: 'description',
          title: 'Meta Description',
          type: 'text',
          validation: (Rule) => Rule.required(),
        },
      ],
    }),
  ],
})

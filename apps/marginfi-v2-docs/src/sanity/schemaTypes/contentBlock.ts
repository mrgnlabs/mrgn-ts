import { defineField, defineType } from 'sanity'

export const contentBlock = defineType({
  name: 'contentBlock',
  title: 'Content Block',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string'
    }),
    defineField({
      name: 'type',
      title: 'Block Type',
      type: 'string',
      options: {
        list: [
          { title: 'Regular Section', value: 'section' },
          { title: 'Method Documentation', value: 'method' },
          { title: 'Properties List', value: 'properties' },
          { title: 'Parameters List', value: 'parameters' }
        ]
      }
    }),
    defineField({
      name: 'tag',
      title: 'Tag',
      type: 'string'
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string'
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H1', value: 'h1' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' }
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Number', value: 'number' }
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' }
            ],
            annotations: [
              {
                title: 'URL',
                name: 'link',
                type: 'object',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url'
                  },
                  {
                    title: 'Button Variant',
                    name: 'variant',
                    type: 'string',
                    options: {
                      list: [
                        { title: 'Text Link', value: 'text' },
                        { title: 'Primary Button', value: 'primary' },
                        { title: 'Secondary Button', value: 'secondary' }
                      ]
                    },
                    initialValue: 'text'
                  }
                ]
              }
            ]
          }
        },
        { type: 'image' },
        { type: 'code' },
        { type: 'note' },
        { type: 'docTable' },
        { type: 'math' }
      ]
    })
  ],
  preview: {
    select: {
      title: 'title',
      type: 'type',
      tag: 'tag'
    },
    prepare({ title, type, tag }) {
      return {
        title: title || 'Untitled Block',
        subtitle: `${type || 'section'}${tag ? ` | ${tag}` : ''}`
      }
    }
  }
})
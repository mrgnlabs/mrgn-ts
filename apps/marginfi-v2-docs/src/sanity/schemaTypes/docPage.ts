// src/sanity/schema/docPage.ts
import { defineField, defineType } from 'sanity'

export const docPage = defineType({
  name: 'docPage',
  title: 'Documentation Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'leadText',
      title: 'Lead Text',
      description: 'A brief introduction or summary that appears at the top of the page',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' }
            ]
          }
        }
      ]
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: Rule => Rule.required()
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
            { title: 'Lead', value: 'lead' },
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
        { type: 'math' },
        { type: 'contentBlock' },
        {
          name: 'properties',
          title: 'Properties List',
          type: 'object',
          fields: [
            {
              name: 'items',
              type: 'array',
              of: [{
                type: 'object',
                fields: [
                  {
                    name: 'name',
                    type: 'string',
                    title: 'Name'
                  },
                  {
                    name: 'type',
                    type: 'string',
                    title: 'Value'
                  }
                ]
              }]
            }
          ]
        },
        {
          name: 'method',
          title: 'Method or Property',
          type: 'object',
          fields: [
            {
              name: 'title',
              type: 'string'
            },
            {
              name: 'format',
              type: 'string',
              options: {
                list: [
                  { title: 'List', value: 'list' },
                  { title: 'Detailed', value: 'detailed' },
                  { title: 'Table', value: 'table' }
                ]
              }
            },
            {
              name: 'items',
              type: 'array',
              of: [{
                type: 'object',
                fields: [
                  {
                    name: 'name',
                    type: 'string',
                    title: 'Name'
                  },
                  {
                    name: 'description',
                    type: 'text',
                    title: 'Description'
                  },
                  {
                    name: 'parametersString',
                    type: 'string',
                    title: 'Parameters'
                  },
                  {
                    name: 'returns',
                    type: 'string',
                    title: 'Returns'
                  },
                  {
                    name: 'resultType',
                    type: 'string',
                    title: 'Result Type'
                  },
                  {
                    name: 'notes',
                    type: 'text',
                    title: 'Notes'
                  }
                ]
              }]
            }
          ]
        }
      ]
    }),
    defineField({
      name: 'metadata',
      title: 'Metadata',
      type: 'object',
      fields: [
        {
          name: 'title',
          title: 'Meta Title',
          description: 'Override the page title for SEO (optional)',
          type: 'string'
        },
        {
          name: 'description',
          title: 'Meta Description',
          type: 'text',
          rows: 2,
          description: 'A brief description of the page for search engines'
        },
        {
          name: 'keywords',
          title: 'Keywords',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'Keywords to help with search engine optimization'
        }
      ]
    })
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current'
    },
    prepare({ title, slug }) {
      return {
        title,
        subtitle: slug
      }
    }
  }
})

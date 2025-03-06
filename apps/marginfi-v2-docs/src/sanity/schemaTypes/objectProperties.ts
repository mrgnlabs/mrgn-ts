import { defineType, defineField } from 'sanity'

export const objectProperties = defineType({
  name: 'objectProperties',
  title: 'Object Properties',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'E.g., "Configuration" or "Settings"',
    }),
    defineField({
      name: 'items',
      title: 'Objects',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'name',
            title: 'Object Name',
            type: 'string',
            validation: (Rule) => Rule.required(),
          },
          {
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{ title: 'Normal', value: 'normal' }],
                lists: [
                  { title: 'Bullet', value: 'bullet' },
                  { title: 'Number', value: 'number' }
                ],
                marks: {
                  decorators: [
                    { title: 'Strong', value: 'strong' },
                    { title: 'Emphasis', value: 'em' },
                    { title: 'Code', value: 'code' }
                  ]
                }
              }
            ]
          },
          {
            name: 'properties',
            title: 'Properties',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                {
                  name: 'name',
                  title: 'Property Name',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: 'type',
                  title: 'Property Type',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: 'description',
                  title: 'Description',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      styles: [{ title: 'Normal', value: 'normal' }],
                      lists: [
                        { title: 'Bullet', value: 'bullet' },
                        { title: 'Number', value: 'number' }
                      ],
                      marks: {
                        decorators: [
                          { title: 'Strong', value: 'strong' },
                          { title: 'Emphasis', value: 'em' },
                          { title: 'Code', value: 'code' }
                        ]
                      }
                    }
                  ]
                },
                {
                  name: 'optional',
                  title: 'Optional',
                  type: 'boolean',
                  initialValue: false,
                }
              ],
              preview: {
                select: {
                  title: 'name',
                  subtitle: 'type'
                }
              }
            }]
          }
        ],
        preview: {
          select: {
            title: 'name'
          }
        }
      }]
    })
  ],
  preview: {
    select: {
      title: 'title'
    },
    prepare({ title }) {
      return {
        title: title || 'Object Properties'
      }
    }
  }
}) 
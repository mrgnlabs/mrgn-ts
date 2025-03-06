import { defineType, defineField } from 'sanity'

export const simpleProperties = defineType({
  name: 'simpleProperties',
  title: 'Simple Properties',
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
    })
  ],
  preview: {
    select: {
      title: 'title'
    },
    prepare({ title }) {
      return {
        title: title || 'Simple Properties'
      }
    }
  }
}) 
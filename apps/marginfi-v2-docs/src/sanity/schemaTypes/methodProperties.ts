import { defineType, defineField } from 'sanity'

export const methodProperties = defineType({
  name: 'methodProperties',
  title: 'Method Properties',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'E.g., "User Actions" or "Methods"',
    }),
    defineField({
      name: 'items',
      title: 'Methods',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'name',
            title: 'Method Name',
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
            name: 'parameters',
            title: 'Parameters',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                {
                  name: 'name',
                  title: 'Parameter Name',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                },
                {
                  name: 'type',
                  title: 'Parameter Type',
                  type: 'string',
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
          },
          {
            name: 'returns',
            title: 'Returns',
            type: 'object',
            fields: [
              {
                name: 'type',
                title: 'Return Type',
                type: 'string'
              },
              {
                name: 'description',
                title: 'Return Description',
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
              }
            ]
          }
        ],
        preview: {
          select: {
            title: 'name'
          }
        }
      }]
    })
  ]
}) 
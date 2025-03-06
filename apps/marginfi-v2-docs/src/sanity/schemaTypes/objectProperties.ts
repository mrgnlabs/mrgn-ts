import { defineType, defineField } from 'sanity'
import { ObjectPropertiesInput } from '~/components/sanity/ObjectPropertiesInput'

export const objectProperties = defineType({
  name: 'objectProperties',
  title: 'Object Properties',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'E.g., "Bank Properties" or "Class Properties"',
    }),
    defineField({
      name: 'items',
      title: 'Properties',
      type: 'array',
      of: [{
        type: 'object',
        name: 'objectProperty',
        fields: [
          {
            name: 'name',
            title: 'Property Name',
            type: 'string',
            description: 'Name of the property',
          },
          {
            name: 'type',
            title: 'Type',
            type: 'string',
            description: 'Type of the property',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [
                  {title: 'Normal', value: 'normal'},
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
                  ]
                }
              }
            ],
            description: 'Description of the property',
          },
          {
            name: 'subProperties',
            title: 'Sub-Properties',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                {
                  name: 'name',
                  type: 'string',
                  title: 'Sub-Property Name'
                },
                {
                  name: 'type',
                  type: 'string',
                  title: 'Sub-Property Type'
                },
                {
                  name: 'description',
                  type: 'array',
                  title: 'Sub-Property Description',
                  of: [
                    {
                      type: 'block',
                      styles: [
                        {title: 'Normal', value: 'normal'},
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
                        ]
                      }
                    }
                  ]
                }
              ]
            }]
          }
        ]
      }]
    })
  ],
  components: {
    input: ObjectPropertiesInput
  }
}) 
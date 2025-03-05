import { defineType, defineField } from 'sanity'
import { BulkPropertiesInput } from '~/components/sanity/BulkPropertiesInput'

export const properties = defineType({
  name: 'properties',
  title: 'Properties',
  type: 'object',
  fields: [
    defineField({
      name: 'format',
      title: 'Documentation Format',
      type: 'string',
      options: {
        list: [
          { title: 'Detailed Method', value: 'detailed' },
          { title: 'Method Table', value: 'table' }
        ]
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'items',
      title: 'Method Items',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'name',
            title: 'Method Name',
            type: 'string',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'text',
          },
          {
            name: 'parameters',
            title: 'Parameters',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                { name: 'name', type: 'string', title: 'Parameter Name' },
                { name: 'type', type: 'string', title: 'Parameter Type' },
                { name: 'description', type: 'text', title: 'Description' },
                { name: 'optional', type: 'boolean', title: 'Optional' }
              ]
            }],
            hidden: ({ document }) => document?.format === 'table'
          },
          {
            name: 'parametersString',
            title: 'Parameters (comma-separated)',
            type: 'string',
            hidden: ({ document }) => document?.format === 'detailed'
          },
          {
            name: 'resultType',
            title: 'Result Type',
            type: 'string',
          },
          {
            name: 'returns',
            title: 'Returns',
            type: 'string',
            hidden: ({ document }) => document?.format === 'detailed'
          },
          {
            name: 'notes',
            title: 'Notes',
            type: 'text',
            hidden: ({ document }) => document?.format === 'detailed'
          }
        ],
      }],
      components: {
        input: BulkPropertiesInput
      }
    }),
  ],
  preview: {
    select: {
      format: 'format'
    },
    prepare({ format }) {
      return {
        title: format === 'detailed' ? 'Detailed Method Documentation' : 'Method Table'
      }
    }
  }
})

interface Properties {
  _type: 'properties';
  _key: string;
  items?: Array<{
    name: string;
    parameters: string;
    resultType: string;
    description: any[];
  }>;
} 
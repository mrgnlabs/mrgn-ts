import { defineType, defineField } from 'sanity'
import { BulkPropertiesInput } from '~/components/sanity/BulkPropertiesInput'

export const properties = defineType({
  name: 'properties',
  title: 'Properties',
  type: 'object',
  fields: [
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
            name: 'parameters',
            title: 'Parameters',
            type: 'string',
          },
          {
            name: 'resultType',
            title: 'Result Type(s)',
            type: 'string',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'array',
            of: [{ type: 'block' }],
          },
        ],
      }],
      components: {
        input: BulkPropertiesInput
      }
    }),
  ],
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
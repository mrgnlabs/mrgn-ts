import { defineType, defineField } from 'sanity'

export const properties = defineType({
  name: 'properties',
  title: 'Properties',
  type: 'object',
  fields: [
    defineField({
      name: 'items',
      title: 'Property Items',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'name',
            title: 'Property Name',
            type: 'string',
          },
          {
            name: 'type',
            title: 'Property Type',
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
    }),
  ],
})

interface Properties {
  _type: 'properties';
  _key: string;
  items?: Array<{
    name: string;
    type: string;
    description: any[];
  }>;
} 
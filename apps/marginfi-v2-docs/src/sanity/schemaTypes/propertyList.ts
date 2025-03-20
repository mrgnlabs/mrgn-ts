import { defineType, defineField } from 'sanity'

export const propertyList = defineType({
  name: 'propertyList',
  title: 'Property List',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Optional title for the property list'
    }),
    defineField({
      name: 'properties',
      title: 'Properties',
      type: 'array',
      of: [{
        type: 'object',
        name: 'property',
        fields: [
          defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
            validation: Rule => Rule.required()
          }),
          defineField({
            name: 'type',
            title: 'Type',
            type: 'string',
            validation: Rule => Rule.required()
          }),
          defineField({
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 2
          })
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
      title: 'title',
      properties: 'properties'
    },
    prepare({ title, properties }) {
      return {
        title: title || 'Property List',
        subtitle: `${properties?.length || 0} properties`
      }
    }
  }
}) 
import { defineType, defineField } from 'sanity'

export const parameterList = defineType({
  name: 'parameterList',
  title: 'Parameter List',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Optional title for the parameter list'
    }),
    defineField({
      name: 'parameters',
      title: 'Parameters',
      type: 'array',
      of: [{
        type: 'object',
        name: 'parameter',
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
      parameters: 'parameters'
    },
    prepare({ title, parameters }) {
      return {
        title: title || 'Parameter List',
        subtitle: `${parameters?.length || 0} parameters`
      }
    }
  }
}) 
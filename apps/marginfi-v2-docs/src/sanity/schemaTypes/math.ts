import { defineType, defineField } from 'sanity'

export const math = defineType({
  name: 'math',
  title: 'Math',
  type: 'object',
  fields: [
    defineField({
      name: 'type',
      title: 'Math Type',
      type: 'string',
      options: {
        list: [
          { title: 'Block Formula', value: 'block' },
          { title: 'Inline Formula', value: 'inline' },
          { title: 'LaTeX Content', value: 'latex' }
        ],
        layout: 'radio'
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'formula',
      title: 'Formula',
      type: 'text',
      validation: Rule => Rule.required()
    })
  ],
  preview: {
    select: {
      formula: 'formula',
      type: 'type'
    },
    prepare({ formula, type }) {
      return {
        title: formula ? formula.substring(0, 50) + (formula.length > 50 ? '...' : '') : 'Math Formula',
        subtitle: `Type: ${type}`
      }
    }
  }
}) 
import { defineType, defineField } from 'sanity'

export const mathBlock = defineType({
  name: 'mathBlock',
  title: 'Math Formula',
  type: 'object',
  fields: [
    defineField({
      name: 'formula',
      title: 'Formula',
      type: 'text',
      validation: (Rule: any) => Rule.required(),
    }),
  ],
}) 
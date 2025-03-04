import { defineType, defineField } from 'sanity'

export const mathInline = defineType({
  name: 'mathInline',
  title: 'Inline Math',
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

export interface MathInline {
  _type: 'mathInline';
  _key: string;
  formula: string;
} 
import { defineType, defineField } from 'sanity'

const richTextEditor = {
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
};

export const docTable = defineType({
  name: 'docTable',
  title: 'Table',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Table Title',
      type: 'string',
      description: 'E.g., "Methods", "Constants", or "Errors"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tableType',
      title: 'Table Type',
      type: 'string',
      options: {
        list: [
          { title: 'Methods', value: 'method' },
          { title: 'Constants', value: 'constant' },
          { title: 'Errors', value: 'error' }
        ],
        layout: 'radio'
      },
      initialValue: 'method',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        groups: [
          {
            name: 'method',
            title: 'Method',
            default: true
          },
          {
            name: 'constant',
            title: 'Constant'
          },
          {
            name: 'error',
            title: 'Error'
          }
        ],
        fields: [
          defineField({
            name: 'name',
            title: 'Name',
            type: 'string',
            description: 'Name of the method, constant, or error',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'parametersString',
            title: 'Parameters',
            type: 'string',
            description: 'Parameter list (e.g., "encoded: Buffer")',
            group: 'method'
          }),
          defineField({
            name: 'resultType',
            title: 'Result Type',
            type: 'string',
            description: 'Return type (e.g., "BankRaw")',
            group: 'method'
          }),
          defineField({
            name: 'description',
            title: 'Description',
            type: 'array',
            description: 'Detailed description of this item',
            of: [richTextEditor]
          }),
          defineField({
            name: 'suggestion',
            title: 'Suggestion',
            type: 'array',
            description: 'Suggested solution or workaround for this error',
            group: 'error',
            of: [richTextEditor]
          })
        ],
        preview: {
          select: {
            title: 'name',
            parametersString: 'parametersString',
            resultType: 'resultType',
            description: 'description'
          },
          prepare(selection) {
            const { title, parametersString, resultType, description } = selection;
            let subtitle = '';
            if (parametersString && resultType) {
              subtitle = `${parametersString} → ${resultType}`;
            } else if (description?.[0]?.children?.[0]?.text) {
              subtitle = description[0].children[0].text;
            }
            return { title, subtitle };
          }
        }
      }]
    })
  ],
  preview: {
    select: {
      title: 'title',
      tableType: 'tableType'
    },
    prepare({ title, tableType }) {
      return {
        title: title || 'Untitled Table',
        subtitle: `Type: ${tableType}`
      };
    }
  }
}) 